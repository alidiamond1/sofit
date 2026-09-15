"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/auth/session";
import { requirePaidClient } from "@/lib/payments/billing";
import { database } from "@/lib/db";
import { todayISO } from "@/lib/schedule";

export type PlanProgressState = { error?: string; success?: string };

const mealSchema = z.object({
  dietPlanId: z.coerce.number().int().positive(),
  itemKey: z.string().trim().min(1).max(190),
  done: z.boolean(),
});

export async function toggleMealCompletionAction(
  _previous: PlanProgressState,
  formData: FormData,
): Promise<PlanProgressState> {
  const session = await requireRole("client");
  const billing = await requirePaidClient(session.id);
  const parsed = mealSchema.safeParse({
    dietPlanId: formData.get("diet_plan_id"),
    itemKey: formData.get("item_key"),
    done: String(formData.get("done")).toLowerCase() === "true",
  });
  if (!parsed.success) return { error: "Could not update this meal." };

  const db = database();
  const client = await db("clients").select("id").where({ user_id: session.id }).first();
  if (!client) return { error: "Client profile not found." };

  const plan = await db("diet_plans").select("id").where({ id: parsed.data.dietPlanId, client_id: client.id, invoice_id: billing.invoice.id }).first();
  if (!plan) return { error: "That diet plan is not assigned to you." };

  const settingsRow = await db("user_settings").select("timezone").where({ user_id: session.id }).first();
  const today = todayISO(String(settingsRow?.timezone || "Africa/Nairobi"));

  if (parsed.data.done) {
    await db("plan_completions")
      .insert({
        client_id: client.id,
        plan_type: "diet",
        plan_id: plan.id,
        item_key: parsed.data.itemKey,
        scheduled_on: today,
        completed_at: new Date(),
      })
      .onConflict(["plan_type", "plan_id", "item_key", "scheduled_on"])
      .merge({ completed_at: new Date() });
  } else {
    await db("plan_completions")
      .where({ plan_type: "diet", plan_id: plan.id, item_key: parsed.data.itemKey, scheduled_on: today })
      .del();
  }

  revalidatePath("/client/health");
  revalidatePath("/client/diet-plan");
  return { success: parsed.data.done ? "Marked done." : "Marked doing." };
}

const exerciseSchema = z.object({
  workoutPlanId: z.coerce.number().int().positive(),
  itemKey: z.string().trim().min(1).max(190),
  done: z.boolean(),
  setsCompleted: z.string().trim().max(20).optional(),
  repsCompleted: z.string().trim().max(20).optional(),
  weightKg: z.string().trim().max(20).optional(),
  notes: z.string().trim().max(500).optional(),
});

export async function toggleWorkoutExerciseAction(
  _previous: PlanProgressState,
  formData: FormData,
): Promise<PlanProgressState> {
  const session = await requireRole("client");
  const billing = await requirePaidClient(session.id);
  const parsed = exerciseSchema.safeParse({
    workoutPlanId: formData.get("workout_plan_id"),
    itemKey: formData.get("item_key"),
    done: String(formData.get("done")).toLowerCase() === "true",
    setsCompleted: formData.get("sets_completed") || undefined,
    repsCompleted: formData.get("reps_completed") || undefined,
    weightKg: formData.get("weight_kg") || undefined,
    notes: formData.get("notes") || undefined,
  });
  if (!parsed.success) return { error: "Could not update this exercise." };

  const db = database();
  const client = await db("clients").select("id").where({ user_id: session.id }).first();
  if (!client) return { error: "Client profile not found." };

  const plan = await db("workout_plans").select("id").where({ id: parsed.data.workoutPlanId, client_id: client.id, invoice_id: billing.invoice.id }).first();
  if (!plan) return { error: "That workout plan is not assigned to you." };

  const settingsRow = await db("user_settings").select("timezone").where({ user_id: session.id }).first();
  const today = todayISO(String(settingsRow?.timezone || "Africa/Nairobi"));

  if (parsed.data.done) {
    const details = {
      setsCompleted: parsed.data.setsCompleted || null,
      repsCompleted: parsed.data.repsCompleted || null,
      weightKg: parsed.data.weightKg || null,
      notes: parsed.data.notes || null,
    };
    await db("plan_completions")
      .insert({
        client_id: client.id,
        plan_type: "workout",
        plan_id: plan.id,
        item_key: parsed.data.itemKey,
        scheduled_on: today,
        details: JSON.stringify(details),
        completed_at: new Date(),
      })
      .onConflict(["plan_type", "plan_id", "item_key", "scheduled_on"])
      .merge({ details: JSON.stringify(details), completed_at: new Date() });
  } else {
    await db("plan_completions")
      .where({ plan_type: "workout", plan_id: plan.id, item_key: parsed.data.itemKey, scheduled_on: today })
      .del();
  }

  revalidatePath("/client/workout-plan");
  revalidatePath("/client/health");
  return { success: parsed.data.done ? "Logged." : "Marked doing." };
}
