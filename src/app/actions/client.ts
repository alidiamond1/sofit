"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/auth/session";
import { database } from "@/lib/db";

function currentWeekStart() {
  const date = new Date();
  const day = date.getDay();
  date.setDate(date.getDate() - (day === 0 ? 6 : day - 1));
  date.setHours(0, 0, 0, 0);
  return date.toISOString().slice(0, 10);
}

const checkInSchema = z.object({
  weight_kg: z.coerce.number().positive().max(500),
  diet_adherence_pct: z.coerce.number().int().min(0).max(100),
  workout_completion_pct: z.coerce.number().int().min(0).max(100),
  energy_score: z.coerce.number().int().min(1).max(10),
  sleep_score: z.coerce.number().int().min(1).max(10),
  client_notes: z.string().trim().min(1).max(5000),
});

export async function submitClientCheckInAction(formData: FormData) {
  const session = await requireRole("client");
  const parsed = checkInSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return;

  const client = await database()("clients").select("id").where({ user_id: session.id }).first();
  if (!client) return;

  await database()("check_ins")
    .insert({
      client_id: client.id,
      week_of: currentWeekStart(),
      ...parsed.data,
      status: "submitted",
    })
    .onConflict(["client_id", "week_of"])
    .merge({
      ...parsed.data,
      status: "submitted",
      updated_at: new Date(),
    });

  revalidatePath("/client");
  revalidatePath("/client/check-in");
  revalidatePath("/client/progress");
  revalidatePath("/coach/check-ins");
}
