"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/auth/session";
import { database } from "@/lib/db";
import { DAY_LABELS, PACKAGE_TIERS } from "@/lib/package-tiers";

export type TierPackageActionState = { error?: string; success?: string };

function safeJson(value: FormDataEntryValue | null): unknown {
  try { return JSON.parse(String(value || "[]")); } catch { return null; }
}

const dayInputSchema = z.object({
  dayIndex: z.coerce.number().int().min(0).max(6),
  meals: z.array(z.object({
    mealId: z.coerce.number().int().positive(),
    time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  })).min(1),
  exercises: z.array(z.object({
    exerciseId: z.coerce.number().int().positive(),
    sets: z.coerce.number().int().min(1).max(20),
    reps: z.string().trim().min(1).max(30),
    rpe: z.coerce.number().min(1).max(10),
    restSeconds: z.coerce.number().int().min(0).max(1200),
  })),
});

const tierPackageSchema = z.object({
  tier: z.enum(PACKAGE_TIERS),
  title: z.string().trim().min(2).max(160),
  days: z.array(dayInputSchema).min(1).max(7),
});

const assignSchema = z.object({
  clientId: z.coerce.number().int().positive(),
  tier: z.enum(PACKAGE_TIERS),
});

export async function saveTierPackageAction(
  _previous: TierPackageActionState,
  formData: FormData,
): Promise<TierPackageActionState> {
  await requireRole("coach");
  const parsed = tierPackageSchema.safeParse({
    tier: formData.get("tier"),
    title: formData.get("title"),
    days: safeJson(formData.get("days_json")),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message || "Add at least one day before saving." };

  const dayIndexes = new Set(parsed.data.days.map((day) => day.dayIndex));
  if (dayIndexes.size !== parsed.data.days.length) return { error: "Each day can only be added once." };

  const db = database();
  const mealIds = [...new Set(parsed.data.days.flatMap((day) => day.meals.map((meal) => meal.mealId)))];
  const exerciseIds = [...new Set(parsed.data.days.flatMap((day) => day.exercises.map((exercise) => exercise.exerciseId)))];
  const [mealRows, exerciseRows] = await Promise.all([
    db("meal_library").whereIn("id", mealIds).where({ is_active: true }),
    exerciseIds.length ? db("exercise_library").whereIn("id", exerciseIds).where({ is_active: true }) : Promise.resolve([]),
  ]);
  if (mealRows.length !== mealIds.length) return { error: "A selected meal is unavailable." };
  if (exerciseRows.length !== exerciseIds.length) return { error: "A selected exercise is unavailable." };
  const mealsById = new Map(mealRows.map((meal) => [Number(meal.id), meal]));
  const exercisesById = new Map(exerciseRows.map((exercise) => [Number(exercise.id), exercise]));

  const days = [...parsed.data.days]
    .sort((a, b) => a.dayIndex - b.dayIndex)
    .map((day) => {
      const dayLabel = DAY_LABELS[day.dayIndex];
      return {
        dayIndex: day.dayIndex,
        dayLabel,
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

  await db("tier_packages")
    .insert({ tier: parsed.data.tier, title: parsed.data.title, days: JSON.stringify(days) })
    .onConflict("tier")
    .merge({ title: parsed.data.title, days: JSON.stringify(days), updated_at: db.fn.now() });

  revalidatePath("/coach/packages");
  return { success: `${parsed.data.title} was saved.` };
}

export async function assignTierPackageAction(
  _previous: TierPackageActionState,
  formData: FormData,
): Promise<TierPackageActionState> {
  await requireRole("coach");
  const parsed = assignSchema.safeParse({
    clientId: formData.get("client_id"),
    tier: formData.get("tier"),
  });
  if (!parsed.success) return { error: "Choose both a client and a package." };

  return { error: "Assign a priced package from the package catalog so the client receives an invoice." };
}
