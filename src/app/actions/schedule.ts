"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/auth/session";
import { database } from "@/lib/db";
import { exercisesForDay, todayISO, weekdayIndex } from "@/lib/schedule";

export type ScheduleActionState = { error?: string; success?: string };

function optionalNumber(value: FormDataEntryValue | null) {
  return value === null || String(value).trim() === "" ? undefined : value;
}

const setDaySchema = z.object({
  clientId: z.coerce.number().int().positive(),
  weekday: z.coerce.number().int().min(0).max(6),
  isRest: z.boolean(),
  workoutPlanId: z.coerce.number().int().positive().optional(),
  workoutDay: z.string().trim().max(80).optional(),
  dietPlanId: z.coerce.number().int().positive().optional(),
});

export async function setDayScheduleAction(
  _previous: ScheduleActionState,
  formData: FormData,
): Promise<ScheduleActionState> {
  await requireRole("coach");
  const isRest = ["1", "on", "true"].includes(String(formData.get("is_rest") || "").toLowerCase());
  const parsed = setDaySchema.safeParse({
    clientId: formData.get("client_id"),
    weekday: formData.get("weekday"),
    isRest,
    workoutPlanId: optionalNumber(formData.get("workout_plan_id")),
    workoutDay: formData.get("workout_day") || undefined,
    dietPlanId: optionalNumber(formData.get("diet_plan_id")),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message || "Check the schedule details." };

  const db = database();
  const client = await db("clients").select("id").where({ id: parsed.data.clientId }).first();
  if (!client) return { error: "The selected client does not exist." };

  let workoutPlanId: number | null = null;
  let workoutDay: string | null = null;
  let dietPlanId: number | null = null;

  if (!parsed.data.isRest) {
    if (parsed.data.workoutPlanId) {
      const plan = await db("workout_plans").select("id").where({ id: parsed.data.workoutPlanId, client_id: client.id }).first();
      if (!plan) return { error: "Choose a workout plan that belongs to this client." };
      workoutPlanId = Number(plan.id);
      workoutDay = parsed.data.workoutDay || null;
    }
    if (parsed.data.dietPlanId) {
      const diet = await db("diet_plans").select("id").where({ id: parsed.data.dietPlanId, client_id: client.id }).first();
      if (!diet) return { error: "Choose a diet plan that belongs to this client." };
      dietPlanId = Number(diet.id);
    }
  }

  const now = new Date();
  await db("client_week_schedule")
    .insert({
      client_id: client.id,
      weekday: parsed.data.weekday,
      workout_plan_id: workoutPlanId,
      workout_day: workoutDay,
      diet_plan_id: dietPlanId,
      is_rest: parsed.data.isRest,
      created_at: now,
      updated_at: now,
    })
    .onConflict(["client_id", "weekday"])
    .merge({ workout_plan_id: workoutPlanId, workout_day: workoutDay, diet_plan_id: dietPlanId, is_rest: parsed.data.isRest, updated_at: now });

  revalidatePath("/coach/schedule");
  revalidatePath("/client");
  revalidatePath("/client/workout-plan");
  return { success: "Day saved." };
}

const toggleSchema = z.object({
  exerciseKey: z.string().trim().min(1).max(190),
  done: z.boolean(),
});

export async function toggleExerciseDoneAction(
  _previous: ScheduleActionState,
  formData: FormData,
): Promise<ScheduleActionState> {
  const session = await requireRole("client");
  const parsed = toggleSchema.safeParse({
    exerciseKey: formData.get("exercise_key"),
    done: String(formData.get("done")).toLowerCase() === "true",
  });
  if (!parsed.success) return { error: "Could not update this exercise." };

  const db = database();
  const client = await db("clients").select("id").where({ user_id: session.id }).first();
  if (!client) return { error: "Client profile not found." };

  const settingsRow = await db("user_settings").select("timezone").where({ user_id: session.id }).first();
  const tz = String(settingsRow?.timezone || "Africa/Nairobi");
  const today = todayISO(tz);
  const slot = await db("client_week_schedule").where({ client_id: client.id, weekday: weekdayIndex(tz) }).first();
  if (!slot || slot.is_rest || !slot.workout_plan_id) return { error: "No workout is scheduled for today." };

  const plan = await db("workout_plans").select("exercises").where({ id: slot.workout_plan_id, client_id: client.id }).first();
  if (!plan) return { error: "Today's scheduled workout is unavailable." };

  const todays = exercisesForDay(plan.exercises, slot.workout_day || null);
  if (!todays.some((exercise) => exercise.key === parsed.data.exerciseKey)) {
    return { error: "That exercise is not part of today's workout." };
  }

  if (parsed.data.done) {
    await db("workout_completions")
      .insert({ client_id: client.id, scheduled_on: today, exercise_key: parsed.data.exerciseKey, completed_at: new Date() })
      .onConflict(["client_id", "scheduled_on", "exercise_key"])
      .ignore();
  } else {
    await db("workout_completions").where({ client_id: client.id, scheduled_on: today, exercise_key: parsed.data.exerciseKey }).del();
  }

  // When the last exercise is ticked, let the coach know (once per day).
  if (parsed.data.done && todays.length > 0) {
    const doneRow = await db("workout_completions")
      .where({ client_id: client.id, scheduled_on: today })
      .whereIn("exercise_key", todays.map((exercise) => exercise.key))
      .count({ total: "*" })
      .first();
    if (Number(doneRow?.total || 0) >= todays.length) {
      const coach = await db("users").select("id").where({ role: "coach", is_active: true }).orderBy("id").first();
      if (coach) {
        const existing = await db("notifications")
          .where({ user_id: coach.id, sender_id: session.id, type: "workout_complete" })
          .where("created_at", ">=", `${today} 00:00:00`)
          .first();
        if (!existing) {
          const now = new Date();
          await db("notifications").insert({
            user_id: coach.id,
            sender_id: session.id,
            title: "Workout completed",
            message: `${session.name} finished today's workout (${todays.length}/${todays.length}).`,
            type: "workout_complete",
            created_at: now,
            updated_at: now,
          });
        }
      }
    }
  }

  revalidatePath("/client");
  revalidatePath("/client/workout-plan");
  return { success: parsed.data.done ? "Marked done." : "Marked not done." };
}
