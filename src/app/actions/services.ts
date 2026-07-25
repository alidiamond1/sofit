"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/auth/session";
import { database } from "@/lib/db";

export type ServiceActionState = {
  error?: string;
  success?: string;
};

const recordIdSchema = z.coerce.number().int().positive();
const serviceSchema = z.object({
  name: z.string().trim().min(2, "Service name is required.").max(100),
  type: z.enum(["consultation", "diet", "workout", "personal_training"]),
  tier: z.enum(["", "elite", "business", "athlete"]),
  price: z.coerce.number().min(0, "Price cannot be negative.").max(1_000_000),
  billingInterval: z.enum(["one_time", "monthly", "quarterly"]),
  description: z.string().trim().max(5000).optional(),
  isActive: z.enum(["true", "false"]),
}).superRefine((value, context) => {
  if (value.type === "personal_training" && !value.tier) {
    context.addIssue({ code: "custom", path: ["tier"], message: "Choose a Personal Training tier." });
  }
});

function serviceInput(formData: FormData) {
  return serviceSchema.safeParse({
    name: formData.get("name"),
    type: formData.get("type"),
    tier: formData.get("tier") || "",
    price: formData.get("price"),
    billingInterval: formData.get("billing_interval"),
    description: formData.get("description") || "",
    isActive: formData.get("is_active"),
  });
}

function refreshServiceViews() {
  revalidatePath("/coach");
  revalidatePath("/coach/services");
  revalidatePath("/coach/packages");
  revalidatePath("/coach/clients");
  revalidatePath("/client");
}

export async function createServiceAction(
  _previousState: ServiceActionState,
  formData: FormData,
): Promise<ServiceActionState> {
  await requireRole("coach");
  const parsed = serviceInput(formData);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message || "Check the service details." };

  const db = database();
  const duplicate = await db("services").select("id").whereRaw("LOWER(name) = LOWER(?)", [parsed.data.name]).first();
  if (duplicate) return { error: "A service with this name already exists." };

  await db("services").insert({
    name: parsed.data.name,
    type: parsed.data.type,
    tier: parsed.data.type === "personal_training" ? parsed.data.tier : null,
    price: parsed.data.price,
    billing_interval: parsed.data.billingInterval,
    description: parsed.data.description || null,
    is_active: parsed.data.isActive === "true",
  });
  refreshServiceViews();
  return { success: `${parsed.data.name} was created.` };
}

export async function updateServiceAction(
  _previousState: ServiceActionState,
  formData: FormData,
): Promise<ServiceActionState> {
  await requireRole("coach");
  const id = recordIdSchema.safeParse(formData.get("id"));
  const parsed = serviceInput(formData);
  if (!id.success) return { error: "The selected service is invalid." };
  if (!parsed.success) return { error: parsed.error.issues[0]?.message || "Check the service details." };

  const db = database();
  const [record, duplicate] = await Promise.all([
    db("services").select("id").where({ id: id.data }).first(),
    db("services").select("id").whereRaw("LOWER(name) = LOWER(?)", [parsed.data.name]).whereNot({ id: id.data }).first(),
  ]);
  if (!record) return { error: "The service no longer exists." };
  if (duplicate) return { error: "Another service already uses this name." };

  await db("services").where({ id: id.data }).update({
    name: parsed.data.name,
    type: parsed.data.type,
    tier: parsed.data.type === "personal_training" ? parsed.data.tier : null,
    price: parsed.data.price,
    billing_interval: parsed.data.billingInterval,
    description: parsed.data.description || null,
    is_active: parsed.data.isActive === "true",
    updated_at: db.fn.now(),
  });
  refreshServiceViews();
  return { success: `${parsed.data.name} was updated.` };
}

export async function deleteServiceAction(
  _previousState: ServiceActionState,
  formData: FormData,
): Promise<ServiceActionState> {
  await requireRole("coach");
  const id = recordIdSchema.safeParse(formData.get("id"));
  if (!id.success) return { error: "The selected service is invalid." };

  const db = database();
  const record = await db("services").select("id", "name").where({ id: id.data }).first();
  if (!record) return { error: "The service no longer exists." };

  await db("services").where({ id: id.data }).del();
  refreshServiceViews();
  return { success: `${record.name} was deleted.` };
}
