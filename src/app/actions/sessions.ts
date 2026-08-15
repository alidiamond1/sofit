"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/auth/session";
import { database } from "@/lib/db";

export type SessionActionState = { error?: string; success?: string };

const bookSchema = z.object({
  clientId: z.coerce.number().int().positive(),
  serviceId: z.coerce.number().int().positive().optional(),
  startsAt: z.string().min(1),
  durationMinutes: z.coerce.number().int().min(15).max(240),
  notes: z.string().trim().max(2000).optional(),
});

export async function bookSessionAction(
  _previous: SessionActionState,
  formData: FormData,
): Promise<SessionActionState> {
  await requireRole("coach");
  const parsed = bookSchema.safeParse({
    clientId: formData.get("client_id"),
    serviceId: formData.get("service_id") || undefined,
    startsAt: formData.get("starts_at"),
    durationMinutes: formData.get("duration_minutes") || 60,
    notes: formData.get("notes") || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message || "Check the session details." };

  const startsAt = new Date(parsed.data.startsAt);
  if (Number.isNaN(startsAt.getTime())) return { error: "Choose a valid date and time." };

  const db = database();
  const client = await db("clients").select("id").where({ id: parsed.data.clientId }).first();
  if (!client) return { error: "Choose a client from the list." };

  let serviceId: number | null = null;
  if (parsed.data.serviceId) {
    const service = await db("services").select("id").where({ id: parsed.data.serviceId, type: "personal_training" }).first();
    if (!service) return { error: "Choose a valid personal training tier." };
    serviceId = Number(service.id);
  }

  const now = new Date();
  await db("sessions").insert({
    client_id: client.id,
    service_id: serviceId,
    starts_at: startsAt,
    duration_minutes: parsed.data.durationMinutes,
    attendance: "scheduled",
    notes: parsed.data.notes || null,
    created_at: now,
    updated_at: now,
  });

  revalidatePath("/coach/personal-training");
  revalidatePath("/coach");
  return { success: "Session booked." };
}

const attendanceSchema = z.object({
  id: z.coerce.number().int().positive(),
  attendance: z.enum(["scheduled", "attended", "cancelled", "no_show"]),
});

export async function updateSessionAttendanceAction(
  _previous: SessionActionState,
  formData: FormData,
): Promise<SessionActionState> {
  await requireRole("coach");
  const parsed = attendanceSchema.safeParse({
    id: formData.get("id"),
    attendance: formData.get("attendance"),
  });
  if (!parsed.success) return { error: "Could not update this session." };

  const db = database();
  const updated = await db("sessions").where({ id: parsed.data.id }).update({ attendance: parsed.data.attendance, updated_at: new Date() });
  if (!updated) return { error: "That session no longer exists." };

  revalidatePath("/coach/personal-training");
  revalidatePath("/coach");
  return { success: "Session updated." };
}
