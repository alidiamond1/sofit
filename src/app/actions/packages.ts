"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/auth/session";
import { database } from "@/lib/db";

export type PackageActionState = {
  error?: string;
  success?: string;
};

const packageSchema = z.object({
  name: z.string().trim().min(2, "Package name is required.").max(120),
  category: z.enum(["beginner", "intermediate", "elite", "business", "athlete"]),
  description: z.string().trim().max(3000).optional(),
  price: z.coerce.number().min(0).max(1_000_000),
  billingInterval: z.enum(["one_time", "monthly", "quarterly"]),
  serviceIds: z.array(z.coerce.number().int().positive()).min(1, "Choose at least one service."),
});

const assignmentSchema = z.object({
  clientId: z.coerce.number().int().positive(),
  packageId: z.coerce.number().int().positive(),
});

const recordIdSchema = z.coerce.number().int().positive();

function packageInput(formData: FormData) {
  const uniqueServiceIds = [...new Set(formData.getAll("service_ids").map(Number).filter(Number.isInteger))];
  return {
    uniqueServiceIds,
    parsed: packageSchema.safeParse({
      name: formData.get("name"),
      category: formData.get("category"),
      description: formData.get("description") || undefined,
      price: formData.get("price"),
      billingInterval: formData.get("billing_interval"),
      serviceIds: uniqueServiceIds,
    }),
  };
}

export async function createPackageAction(
  _previousState: PackageActionState,
  formData: FormData,
): Promise<PackageActionState> {
  await requireRole("coach");

  const { parsed } = packageInput(formData);

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || "Check the package details." };
  }

  const db = database();
  const existing = await db("packages")
    .select("id")
    .whereRaw("LOWER(name) = LOWER(?)", [parsed.data.name])
    .first();
  if (existing) return { error: "A package with this name already exists." };

  const services = await db("services")
    .select("id")
    .whereIn("id", parsed.data.serviceIds)
    .where({ is_active: true });
  if (services.length !== parsed.data.serviceIds.length) {
    return { error: "One or more selected services are unavailable." };
  }

  await db.transaction(async (trx) => {
    const [packageId] = await trx("packages").insert({
      name: parsed.data.name,
      category: parsed.data.category,
      description: parsed.data.description || null,
      price: parsed.data.price,
      billing_interval: parsed.data.billingInterval,
      is_active: true,
    });

    await trx("package_services").insert(
      parsed.data.serviceIds.map((serviceId) => {
        const requestedQuantity = Number(formData.get(`quantity_${serviceId}`));
        return {
          package_id: packageId,
          service_id: serviceId,
          quantity: Number.isInteger(requestedQuantity) && requestedQuantity > 0
            ? Math.min(requestedQuantity, 100)
            : 1,
        };
      }),
    );
  });

  revalidatePath("/coach/packages");
  return { success: `${parsed.data.name} was created successfully.` };
}

export async function updatePackageAction(
  _previousState: PackageActionState,
  formData: FormData,
): Promise<PackageActionState> {
  await requireRole("coach");
  const id = recordIdSchema.safeParse(formData.get("id"));
  const { parsed } = packageInput(formData);
  if (!id.success) return { error: "The selected package is invalid." };
  if (!parsed.success) return { error: parsed.error.issues[0]?.message || "Check the package details." };

  const db = database();
  const [record, duplicate, services] = await Promise.all([
    db("packages").select("id").where({ id: id.data }).first(),
    db("packages").select("id").whereRaw("LOWER(name) = LOWER(?)", [parsed.data.name]).whereNot({ id: id.data }).first(),
    db("services").select("id").whereIn("id", parsed.data.serviceIds).where({ is_active: true }),
  ]);
  if (!record) return { error: "The package no longer exists." };
  if (duplicate) return { error: "Another package already uses this name." };
  if (services.length !== parsed.data.serviceIds.length) return { error: "One or more selected services are unavailable." };

  await db.transaction(async (trx) => {
    await trx("packages").where({ id: id.data }).update({
      name: parsed.data.name,
      category: parsed.data.category,
      description: parsed.data.description || null,
      price: parsed.data.price,
      billing_interval: parsed.data.billingInterval,
      updated_at: trx.fn.now(),
    });
    await trx("package_services").where({ package_id: id.data }).del();
    await trx("package_services").insert(parsed.data.serviceIds.map((serviceId) => {
      const requestedQuantity = Number(formData.get(`quantity_${serviceId}`));
      return {
        package_id: id.data,
        service_id: serviceId,
        quantity: Number.isInteger(requestedQuantity) && requestedQuantity > 0 ? Math.min(requestedQuantity, 100) : 1,
      };
    }));
  });
  revalidatePath("/coach/packages");
  revalidatePath("/coach/clients");
  revalidatePath("/client");
  revalidatePath("/client/profile");
  return { success: `${parsed.data.name} was updated.` };
}

export async function deletePackageAction(
  _previousState: PackageActionState,
  formData: FormData,
): Promise<PackageActionState> {
  await requireRole("coach");
  const id = recordIdSchema.safeParse(formData.get("id"));
  if (!id.success) return { error: "The selected package is invalid." };
  const db = database();
  const record = await db("packages").select("id", "name").where({ id: id.data }).first();
  if (!record) return { error: "The package no longer exists." };
  await db("packages").where({ id: id.data }).del();
  revalidatePath("/coach/packages");
  revalidatePath("/coach/clients");
  revalidatePath("/client");
  revalidatePath("/client/profile");
  return { success: `${record.name} was deleted.` };
}

export async function assignPackageAction(
  _previousState: PackageActionState,
  formData: FormData,
): Promise<PackageActionState> {
  await requireRole("coach");

  const parsed = assignmentSchema.safeParse({
    clientId: formData.get("client_id"),
    packageId: formData.get("package_id"),
  });
  if (!parsed.success) return { error: "Choose both a client and a package." };

  const db = database();
  const [client, packageRecord] = await Promise.all([
    db("clients").select("id").where({ id: parsed.data.clientId }).first(),
    db("packages").select("id", "name").where({ id: parsed.data.packageId, is_active: true }).first(),
  ]);
  if (!client) return { error: "The selected client does not exist." };
  if (!packageRecord) return { error: "The selected package is unavailable." };

  await db("clients").where({ id: client.id }).update({ package_id: packageRecord.id });

  revalidatePath("/coach/packages");
  revalidatePath("/coach/clients");
  revalidatePath("/client");
  revalidatePath("/client/profile");
  return { success: `${packageRecord.name} was assigned to the client.` };
}
