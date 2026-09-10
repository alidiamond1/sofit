"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/auth/session";
import { database } from "@/lib/db";
import { assignPricedPackage, BillingError, syncUnpaidPackageInvoice } from "@/lib/payments/billing";
import { PACKAGE_BILLING_INTERVALS, PACKAGE_CATEGORIES } from "@/lib/package-tiers";

export type PackageActionState = { error?: string; success?: string };

const recordIdSchema = z.coerce.number().int().positive();

function optionalId(value: FormDataEntryValue | null) {
  return value === null || String(value).trim() === "" ? undefined : value;
}

const packageSchema = z.object({
  name: z.string().trim().min(2, "Package name is required.").max(120),
  category: z.enum(PACKAGE_CATEGORIES),
  description: z.string().trim().max(2000).optional(),
  price: z.coerce.number().min(0, "Price cannot be negative.").max(1_000_000).multipleOf(0.01, "Use at most two decimal places."),
  billingInterval: z.enum(PACKAGE_BILLING_INTERVALS),
  isActive: z.enum(["true", "false"]),
  dietGroupId: recordIdSchema.optional(),
  workoutGroupId: recordIdSchema.optional(),
});

function packageInput(formData: FormData) {
  return packageSchema.safeParse({
    name: formData.get("name"),
    category: formData.get("category"),
    description: formData.get("description") || "",
    price: formData.get("price"),
    billingInterval: formData.get("billing_interval"),
    isActive: formData.get("is_active"),
    dietGroupId: optionalId(formData.get("diet_group_id")),
    workoutGroupId: optionalId(formData.get("workout_group_id")),
  });
}

function refreshPackageViews() {
  revalidatePath("/coach/packages");
  revalidatePath("/coach/clients");
  revalidatePath("/client", "layout");
  revalidatePath("/coach/assignments");
  revalidatePath("/coach/payments");
}

async function assertGroupsExist(dietGroupId: number | undefined, workoutGroupId: number | undefined) {
  const db = database();
  if (dietGroupId) {
    const row = await db("diet_groups").select("id").where({ id: dietGroupId }).first();
    if (!row) return "The selected diet group does not exist.";
  }
  if (workoutGroupId) {
    const row = await db("workout_groups").select("id").where({ id: workoutGroupId }).first();
    if (!row) return "The selected workout group does not exist.";
  }
  return null;
}

export async function createPackageAction(
  _previous: PackageActionState,
  formData: FormData,
): Promise<PackageActionState> {
  await requireRole("coach");
  const parsed = packageInput(formData);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message || "Check the package details." };

  const groupError = await assertGroupsExist(parsed.data.dietGroupId, parsed.data.workoutGroupId);
  if (groupError) return { error: groupError };

  const db = database();
  await db("packages").insert({
    name: parsed.data.name,
    category: parsed.data.category,
    description: parsed.data.description || null,
    price: parsed.data.price,
    billing_interval: parsed.data.billingInterval,
    is_active: parsed.data.isActive === "true",
    diet_group_id: parsed.data.dietGroupId ?? null,
    workout_group_id: parsed.data.workoutGroupId ?? null,
  });
  refreshPackageViews();
  return { success: `${parsed.data.name} was created.` };
}

export async function updatePackageAction(
  _previous: PackageActionState,
  formData: FormData,
): Promise<PackageActionState> {
  await requireRole("coach");
  const id = recordIdSchema.safeParse(formData.get("id"));
  const parsed = packageInput(formData);
  if (!id.success) return { error: "The selected package is invalid." };
  if (!parsed.success) return { error: parsed.error.issues[0]?.message || "Check the package details." };

  const groupError = await assertGroupsExist(parsed.data.dietGroupId, parsed.data.workoutGroupId);
  if (groupError) return { error: groupError };

  const db = database();
  const record = await db("packages").select("id").where({ id: id.data }).first();
  if (!record) return { error: "The package no longer exists." };

  await db.transaction(async (trx) => {
    const clients = await trx("clients").where({ package_id: id.data }).orderBy("id").forUpdate();
    await trx("packages").where({ id: id.data }).update({
      name: parsed.data.name,
      category: parsed.data.category,
      description: parsed.data.description || null,
      price: parsed.data.price,
      billing_interval: parsed.data.billingInterval,
      is_active: parsed.data.isActive === "true",
      diet_group_id: parsed.data.dietGroupId ?? null,
      workout_group_id: parsed.data.workoutGroupId ?? null,
      updated_at: db.fn.now(),
    });
    const pkg = await trx("packages").where({ id: id.data }).first();
    for (const client of clients) {
      const invoice = client.current_invoice_id && await trx("invoices").where({ id: client.current_invoice_id, package_id: id.data }).forUpdate().first();
      if (invoice?.package_snapshot) await syncUnpaidPackageInvoice(trx, invoice, pkg);
    }
  });
  refreshPackageViews();
  return { success: `${parsed.data.name} was updated.` };
}

export async function deletePackageAction(
  _previous: PackageActionState,
  formData: FormData,
): Promise<PackageActionState> {
  await requireRole("coach");
  const id = recordIdSchema.safeParse(formData.get("id"));
  if (!id.success) return { error: "The selected package is invalid." };

  const db = database();
  const record = await db("packages").select("id", "name").where({ id: id.data }).first();
  if (!record) return { error: "The package no longer exists." };

  const billed = await db("invoices").where({ package_id: id.data }).first();
  if (billed) return { error: "This package has billing history. Set it to inactive instead of deleting it." };
  await db("packages").where({ id: id.data }).del();
  refreshPackageViews();
  return { success: `${record.name} was deleted.` };
}

const assignSchema = z.object({
  clientId: z.coerce.number().int().positive(),
  packageId: z.coerce.number().int().positive(),
});

export async function assignPackageAction(
  _previous: PackageActionState,
  formData: FormData,
): Promise<PackageActionState> {
  await requireRole("coach");
  const parsed = assignSchema.safeParse({ clientId: formData.get("client_id"), packageId: formData.get("package_id") });
  if (!parsed.success) return { error: "Choose both a client and a package." };
  try {
    await database().transaction((trx) => assignPricedPackage(trx, parsed.data.clientId, parsed.data.packageId));
  } catch (error) {
    return { error: error instanceof BillingError ? error.message : "The package could not be assigned. Please try again." };
  }
  refreshPackageViews();
  revalidatePath("/client", "layout");
  revalidatePath("/coach/payments");
  return { success: "Package assigned. The invoice is ready; program access opens after verified payment." };
}
