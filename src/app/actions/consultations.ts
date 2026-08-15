"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/auth/session";
import { database } from "@/lib/db";

export type ConsultationActionState = { error?: string; success?: string };

const bookSchema = z.object({
  clientId: z.coerce.number().int().positive(),
  startsAt: z.string().min(1),
  durationMinutes: z.coerce.number().int().min(15).max(240),
  notes: z.string().trim().max(2000).optional(),
});

export async function bookConsultationAction(
  _previous: ConsultationActionState,
  formData: FormData,
): Promise<ConsultationActionState> {
  await requireRole("coach");
  const parsed = bookSchema.safeParse({
    clientId: formData.get("client_id"),
    startsAt: formData.get("starts_at"),
    durationMinutes: formData.get("duration_minutes") || 60,
    notes: formData.get("notes") || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message || "Check the consultation details." };

  const startsAt = new Date(parsed.data.startsAt);
  if (Number.isNaN(startsAt.getTime())) return { error: "Choose a valid date and time." };

  const db = database();
  const client = await db("clients").select("id").where({ id: parsed.data.clientId }).first();
  if (!client) return { error: "Choose a client from the list." };

  const now = new Date();
  await db("consultations").insert({
    client_id: client.id,
    starts_at: startsAt,
    duration_minutes: parsed.data.durationMinutes,
    status: "scheduled",
    session_notes: parsed.data.notes || null,
    created_at: now,
    updated_at: now,
  });

  revalidatePath("/coach/consultations");
  revalidatePath("/coach");
  return { success: "Consultation booked." };
}

const statusSchema = z.object({
  id: z.coerce.number().int().positive(),
  status: z.enum(["scheduled", "completed", "cancelled", "no_show"]),
  notes: z.string().trim().max(2000).optional(),
});

export async function updateConsultationStatusAction(
  _previous: ConsultationActionState,
  formData: FormData,
): Promise<ConsultationActionState> {
  await requireRole("coach");
  const parsed = statusSchema.safeParse({
    id: formData.get("id"),
    status: formData.get("status"),
    notes: formData.get("notes") || undefined,
  });
  if (!parsed.success) return { error: "Could not update this consultation." };

  const db = database();
  const updated = await db("consultations")
    .where({ id: parsed.data.id })
    .update({ status: parsed.data.status, session_notes: parsed.data.notes ?? undefined, updated_at: new Date() });
  if (!updated) return { error: "That consultation no longer exists." };

  revalidatePath("/coach/consultations");
  revalidatePath("/coach");
  return { success: "Consultation updated." };
}
