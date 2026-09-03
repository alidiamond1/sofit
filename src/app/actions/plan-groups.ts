"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/auth/session";
import { database } from "@/lib/db";
import { DAY_LABELS } from "@/lib/package-tiers";

export type PlanGroupActionState = { error?: string; success?: string };

const recordIdSchema = z.coerce.number().int().positive();

function safeJson(value: FormDataEntryValue | null): unknown {
  try { return JSON.parse(String(value || "[]")); } catch { return null; }
}

function optionalId(value: FormDataEntryValue | null) {
  return value === null || String(value).trim() === "" ? undefined : value;
}

const dietDayInputSchema = z.object({
  dayIndex: z.coerce.number().int().min(0).max(6),
  meals: z.array(z.object({
    mealId: z.coerce.number().int().positive(),
    time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  })).min(1),
});

const workoutDayInputSchema = z.object({
  dayIndex: z.coerce.number().int().min(0).max(6),
  exercises: z.array(z.object({
    exerciseId: z.coerce.number().int().positive(),
    sets: z.coerce.number().int().min(1).max(20),
    reps: z.string().trim().min(1).max(30),
    rpe: z.coerce.number().min(1).max(10),
    restSeconds: z.coerce.number().int().min(0).max(1200),
  })).min(1),
});

const dietGroupSchema = z.object({
  id: recordIdSchema.optional(),
  name: z.string().trim().min(2).max(160),
  description: z.string().trim().max(2000).optional(),
  days: z.array(dietDayInputSchema).min(1).max(7),
});

const workoutGroupSchema = z.object({
  id: recordIdSchema.optional(),
  name: z.string().trim().min(2).max(160),
  description: z.string().trim().max(2000).optional(),
  days: z.array(workoutDayInputSchema).min(1).max(7),
});

function refreshDietGroupViews() {
  revalidatePath("/coach/diet-plans");
  revalidatePath("/coach/packages");
}

function refreshWorkoutGroupViews() {
  revalidatePath("/coach/workout-plans");
  revalidatePath("/coach/packages");
}

export async function saveDietGroupAction(
  _previous: PlanGroupActionState,
  formData: FormData,
): Promise<PlanGroupActionState> {
  await requireRole("coach");
  const parsed = dietGroupSchema.safeParse({
    id: optionalId(formData.get("id")),
    name: formData.get("name"),
    description: formData.get("description") || undefined,
    days: safeJson(formData.get("days_json")),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message || "Add at least one meal before saving." };

  const dayIndexes = new Set(parsed.data.days.map((day) => day.dayIndex));
  if (dayIndexes.size !== parsed.data.days.length) return { error: "Each day can only be added once." };

  const db = database();
  if (parsed.data.id) {
    const record = await db("diet_groups").select("id").where({ id: parsed.data.id }).first();
    if (!record) return { error: "The diet group no longer exists." };
  }

  const mealIds = [...new Set(parsed.data.days.flatMap((day) => day.meals.map((meal) => meal.mealId)))];
  const mealRows = await db("meal_library").whereIn("id", mealIds).where({ is_active: true });
  if (mealRows.length !== mealIds.length) return { error: "A selected meal is unavailable." };
  const mealsById = new Map(mealRows.map((meal) => [Number(meal.id), meal]));

  const days = [...parsed.data.days]
    .sort((a, b) => a.dayIndex - b.dayIndex)
    .map((day) => ({
      dayIndex: day.dayIndex,
      dayLabel: DAY_LABELS[day.dayIndex],
      meals: day.meals.map((selection) => {
        const meal = mealsById.get(selection.mealId);
        return {
          meal_id: selection.mealId,
          type: meal.meal_type,
          name: meal.name,
          time: selection.time,
          calories: meal.calories,
          protein_g: meal.protein_g,
          carbs_g: meal.carbs_g,
          fat_g: meal.fat_g,
          ingredients: String(meal.ingredients).split(/\r?\n|,/).map((item) => item.trim()).filter(Boolean),
          instructions: meal.instructions,
          media_url: meal.media_url,
        };
      }),
    }));

  if (parsed.data.id) {
    await db("diet_groups").where({ id: parsed.data.id }).update({
      name: parsed.data.name,
      description: parsed.data.description || null,
      days: JSON.stringify(days),
      updated_at: db.fn.now(),
    });
  } else {
    await db("diet_groups").insert({
      name: parsed.data.name,
      description: parsed.data.description || null,
      days: JSON.stringify(days),
      is_active: true,
    });
  }
  refreshDietGroupViews();
  return { success: `${parsed.data.name} was saved.` };
}

export async function saveWorkoutGroupAction(
  _previous: PlanGroupActionState,
  formData: FormData,
): Promise<PlanGroupActionState> {
  await requireRole("coach");
  const parsed = workoutGroupSchema.safeParse({
    id: optionalId(formData.get("id")),
    name: formData.get("name"),
    description: formData.get("description") || undefined,
    days: safeJson(formData.get("days_json")),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message || "Add at least one exercise before saving." };

  const dayIndexes = new Set(parsed.data.days.map((day) => day.dayIndex));
  if (dayIndexes.size !== parsed.data.days.length) return { error: "Each day can only be added once." };

  const db = database();
  if (parsed.data.id) {
    const record = await db("workout_groups").select("id").where({ id: parsed.data.id }).first();
    if (!record) return { error: "The workout group no longer exists." };
  }

  const exerciseIds = [...new Set(parsed.data.days.flatMap((day) => day.exercises.map((exercise) => exercise.exerciseId)))];
  const exerciseRows = await db("exercise_library").whereIn("id", exerciseIds).where({ is_active: true });
  if (exerciseRows.length !== exerciseIds.length) return { error: "A selected exercise is unavailable." };
  const exercisesById = new Map(exerciseRows.map((exercise) => [Number(exercise.id), exercise]));

  const days = [...parsed.data.days]
    .sort((a, b) => a.dayIndex - b.dayIndex)
    .map((day) => {
      const dayLabel = DAY_LABELS[day.dayIndex];
      return {
        dayIndex: day.dayIndex,
        dayLabel,
        exercises: day.exercises.map((selection) => {
          const exercise = exercisesById.get(selection.exerciseId);
          return {
            exercise_id: selection.exerciseId,
            day: dayLabel,
            exercise: exercise.name,
            muscle_group: exercise.muscle_group,
            equipment: exercise.equipment,
            difficulty: exercise.difficulty,
            motion_type: exercise.motion_type,
            media_url: exercise.media_url,
            instructions: exercise.instructions,
            sets: selection.sets,
            reps: selection.reps,
            rpe: selection.rpe,
            rest_seconds: selection.restSeconds,
          };
        }),
      };
    });

  if (parsed.data.id) {
    await db("workout_groups").where({ id: parsed.data.id }).update({
      name: parsed.data.name,
      description: parsed.data.description || null,
      days: JSON.stringify(days),
      updated_at: db.fn.now(),
    });
  } else {
    await db("workout_groups").insert({
      name: parsed.data.name,
      description: parsed.data.description || null,
      days: JSON.stringify(days),
      is_active: true,
    });
  }
  refreshWorkoutGroupViews();
  return { success: `${parsed.data.name} was saved.` };
}

export async function setDietGroupActiveAction(
  _previous: PlanGroupActionState,
  formData: FormData,
): Promise<PlanGroupActionState> {
  await requireRole("coach");
  const id = recordIdSchema.safeParse(formData.get("id"));
  if (!id.success) return { error: "The selected diet group is invalid." };
  const isActive = formData.get("is_active") === "true";

  const db = database();
  const record = await db("diet_groups").select("id", "name").where({ id: id.data }).first();
  if (!record) return { error: "The diet group no longer exists." };

  await db("diet_groups").where({ id: id.data }).update({ is_active: isActive, updated_at: db.fn.now() });
  refreshDietGroupViews();
  return { success: `${record.name} was ${isActive ? "restored" : "archived"}.` };
}

export async function deleteDietGroupAction(
  _previous: PlanGroupActionState,
  formData: FormData,
): Promise<PlanGroupActionState> {
  await requireRole("coach");
  const id = recordIdSchema.safeParse(formData.get("id"));
  if (!id.success) return { error: "The selected diet group is invalid." };

  const db = database();
  const record = await db("diet_groups").select("id", "name").where({ id: id.data }).first();
  if (!record) return { error: "The diet group no longer exists." };

  await db("diet_groups").where({ id: id.data }).del();
  refreshDietGroupViews();
  return { success: `${record.name} was deleted.` };
}

export async function setWorkoutGroupActiveAction(
  _previous: PlanGroupActionState,
  formData: FormData,
): Promise<PlanGroupActionState> {
  await requireRole("coach");
  const id = recordIdSchema.safeParse(formData.get("id"));
  if (!id.success) return { error: "The selected workout group is invalid." };
  const isActive = formData.get("is_active") === "true";

  const db = database();
  const record = await db("workout_groups").select("id", "name").where({ id: id.data }).first();
  if (!record) return { error: "The workout group no longer exists." };

  await db("workout_groups").where({ id: id.data }).update({ is_active: isActive, updated_at: db.fn.now() });
  refreshWorkoutGroupViews();
  return { success: `${record.name} was ${isActive ? "restored" : "archived"}.` };
}

export async function deleteWorkoutGroupAction(
  _previous: PlanGroupActionState,
  formData: FormData,
): Promise<PlanGroupActionState> {
  await requireRole("coach");
  const id = recordIdSchema.safeParse(formData.get("id"));
  if (!id.success) return { error: "The selected workout group is invalid." };

  const db = database();
  const record = await db("workout_groups").select("id", "name").where({ id: id.data }).first();
  if (!record) return { error: "The workout group no longer exists." };

  await db("workout_groups").where({ id: id.data }).del();
  refreshWorkoutGroupViews();
  return { success: `${record.name} was deleted.` };
}
