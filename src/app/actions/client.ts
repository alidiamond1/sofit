"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/auth/session";
import { currentWeekStart } from "@/lib/check-in-week";
import { database } from "@/lib/db";

// A photo slot's hidden input is always present (MediaUploader-style components
// render it even when empty) so an unfilled slot arrives as "" — normalize that
// to null before validating, then accept only a real URL or nothing at all.
// Kept optional/nullable server-side (never required) so old rows and any
// resubmission that omits a slot never fail validation, even though the client
// UI treats all three as the expected default.
const progressPhotoUrl = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? null : value),
  z.string().url().nullable().optional(),
);

const checkInSchema = z.object({
  weight_kg: z.coerce.number().positive().max(500),
  diet_adherence_pct: z.coerce.number().int().min(0).max(100),
  workout_completion_pct: z.coerce.number().int().min(0).max(100),
  energy_score: z.coerce.number().int().min(1).max(10),
  sleep_score: z.coerce.number().int().min(1).max(10),
  client_notes: z.string().trim().min(1).max(5000),
  progress_photo_front: progressPhotoUrl,
  progress_photo_side: progressPhotoUrl,
  progress_photo_back: progressPhotoUrl,
});

export async function submitClientCheckInAction(formData: FormData) {
  const session = await requireRole("client");
  const parsed = checkInSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return;

  const { progress_photo_front, progress_photo_side, progress_photo_back, ...checkIn } = parsed.data;
  const progressPhotos = JSON.stringify({
    front: progress_photo_front ?? null,
    side: progress_photo_side ?? null,
    back: progress_photo_back ?? null,
  });

  const client = await database()("clients").select("id").where({ user_id: session.id }).first();
  if (!client) return;

  await database()("check_ins")
    .insert({
      client_id: client.id,
      week_of: currentWeekStart(),
      ...checkIn,
      progress_photos: progressPhotos,
      status: "submitted",
    })
    .onConflict(["client_id", "week_of"])
    .merge({
      ...checkIn,
      progress_photos: progressPhotos,
      status: "submitted",
      updated_at: new Date(),
    });

  revalidatePath("/client");
  revalidatePath("/client/check-in");
  revalidatePath("/client/progress");
  revalidatePath("/coach/check-ins");
  revalidatePath("/coach/clients");
}
