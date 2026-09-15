"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/auth/session";
import { database } from "@/lib/db";

export type CheckInActionState = { error?: string; success?: string };

const feedbackSchema = z.object({
  id: z.coerce.number().int().positive(),
  coachFeedback: z.string().trim().max(4000),
});

export async function reviewCheckInAction(
  _previous: CheckInActionState,
  formData: FormData,
): Promise<CheckInActionState> {
  await requireRole("coach");
  const parsed = feedbackSchema.safeParse({ id: formData.get("id"), coachFeedback: formData.get("coach_feedback") || "" });
  if (!parsed.success) return { error: "Could not save feedback." };

  const db = database();
  const updated = await db("check_ins")
    .where({ id: parsed.data.id })
    .update({ coach_feedback: parsed.data.coachFeedback || null, status: "reviewed", updated_at: new Date() });
  if (!updated) return { error: "That check-in no longer exists." };

  revalidatePath("/coach/check-ins");
  revalidatePath("/coach");
  revalidatePath("/client/health");
  revalidatePath("/client");
  return { success: "Feedback saved." };
}
