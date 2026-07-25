"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/auth/session";
import { database } from "@/lib/db";

export type ClientActionState = {
  error?: string;
  success?: string;
};

const recordIdSchema = z.coerce.number().int().positive();
const nullableIdSchema = z.union([z.literal(""), z.coerce.number().int().positive()]);
const clientSchema = z.object({
  name: z.string().trim().min(2, "Client name is required.").max(120),
  email: z.string().trim().toLowerCase().email("Enter a valid email address.").max(190),
  phone: z.string().trim().max(40).optional(),
  dateOfBirth: z.union([z.literal(""), z.iso.date()]),
  status: z.enum(["active", "paused", "churned"]),
  pipelineStage: z.enum(["lead", "onboarding", "active", "renewal"]),
  serviceId: nullableIdSchema,
  packageId: nullableIdSchema,
  goals: z.string().trim().max(5000).optional(),
  medicalNotes: z.string().trim().max(5000).optional(),
});

function refreshClientViews() {
  revalidatePath("/coach");
  revalidatePath("/coach/clients");
  revalidatePath("/coach/services");
  revalidatePath("/coach/packages");
  revalidatePath("/client");
  revalidatePath("/client/profile");
}

export async function updateClientAction(
  _previousState: ClientActionState,
  formData: FormData,
): Promise<ClientActionState> {
  await requireRole("coach");

  const id = recordIdSchema.safeParse(formData.get("id"));
  const parsed = clientSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    phone: formData.get("phone") || "",
    dateOfBirth: formData.get("date_of_birth") || "",
    status: formData.get("status"),
    pipelineStage: formData.get("pipeline_stage"),
    serviceId: formData.get("service_id") || "",
    packageId: formData.get("package_id") || "",
    goals: formData.get("goals") || "",
    medicalNotes: formData.get("medical_notes") || "",
  });

  if (!id.success) return { error: "The selected client is invalid." };
  if (!parsed.success) return { error: parsed.error.issues[0]?.message || "Check the client details." };

  const db = database();
  const client = await db("clients").select("id", "user_id").where({ id: id.data }).first();
  if (!client) return { error: "The client no longer exists." };

  const duplicateEmail = await db("users")
    .select("id")
    .whereRaw("LOWER(email) = LOWER(?)", [parsed.data.email])
    .whereNot({ id: client.user_id })
    .first();
  if (duplicateEmail) return { error: "Another account already uses this email address." };

  const serviceId = parsed.data.serviceId === "" ? null : parsed.data.serviceId;
  const packageId = parsed.data.packageId === "" ? null : parsed.data.packageId;
  const [service, packageRecord] = await Promise.all([
    serviceId ? db("services").select("id").where({ id: serviceId }).first() : null,
    packageId ? db("packages").select("id").where({ id: packageId }).first() : null,
  ]);
  if (serviceId && !service) return { error: "The selected service is unavailable." };
  if (packageId && !packageRecord) return { error: "The selected package is unavailable." };

  await db.transaction(async (trx) => {
    await trx("users").where({ id: client.user_id }).update({
      name: parsed.data.name,
      email: parsed.data.email,
      updated_at: trx.fn.now(),
    });
    await trx("clients").where({ id: id.data }).update({
      phone: parsed.data.phone || null,
      date_of_birth: parsed.data.dateOfBirth || null,
      status: parsed.data.status,
      pipeline_stage: parsed.data.pipelineStage,
      service_id: serviceId,
      package_id: packageId,
      goals: parsed.data.goals || null,
      medical_notes: parsed.data.medicalNotes || null,
      updated_at: trx.fn.now(),
    });
  });

  refreshClientViews();
  return { success: `${parsed.data.name} was updated.` };
}

export async function deleteClientAction(
  _previousState: ClientActionState,
  formData: FormData,
): Promise<ClientActionState> {
  await requireRole("coach");
  const id = recordIdSchema.safeParse(formData.get("id"));
  if (!id.success) return { error: "The selected client is invalid." };

  const db = database();
  const client = await db("clients")
    .select("clients.id", "clients.user_id", "users.name")
    .join("users", "users.id", "clients.user_id")
    .where("clients.id", id.data)
    .first();
  if (!client) return { error: "The client no longer exists." };

  await db("users").where({ id: client.user_id }).del();
  refreshClientViews();
  return { success: `${client.name} was deleted.` };
}
