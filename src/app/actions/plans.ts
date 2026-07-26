"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/auth/session";
import { database } from "@/lib/db";
import { STARTER_EXERCISES } from "@/lib/workout/starter-exercises";

export type PlanActionState = { error?: string; success?: string };

const nullableMacro = z.coerce.number().int().min(0).max(5000).optional();

const mealTemplateSchema = z.object({
  name: z.string().trim().min(2).max(140),
  mealType: z.enum(["breakfast", "lunch", "dinner", "snack"]),
  calories: nullableMacro,
  protein: nullableMacro,
  carbs: nullableMacro,
  fat: nullableMacro,
  ingredients: z.string().trim().min(2).max(5000),
  instructions: z.string().trim().max(5000).optional(),
  mediaUrl: z.union([z.literal(""), z.string().url().max(1000)]),
});

const exerciseSchema = z.object({
  name: z.string().trim().min(2).max(140),
  muscleGroup: z.string().trim().min(2).max(80),
  equipment: z.string().trim().min(2).max(100),
  difficulty: z.enum(["beginner", "intermediate", "advanced"]),
  motionType: z.enum(["squat", "hinge", "push", "pull", "lunge", "plank", "curl", "press", "custom"]),
  mediaUrl: z.union([z.literal(""), z.string().url().max(1000)]),
  instructions: z.string().trim().max(5000).optional(),
});

const dietPlanSchema = z.object({
  clientId: z.coerce.number().int().positive(),
  title: z.string().trim().min(2).max(160),
  calories: z.coerce.number().int().min(0).max(10000),
  protein: nullableMacro,
  carbs: nullableMacro,
  fat: nullableMacro,
  startsOn: z.string().date(),
  status: z.enum(["draft", "active"]),
  meals: z.array(z.object({
    mealId: z.coerce.number().int().positive(),
    time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  })).min(1),
});

const workoutPlanSchema = z.object({
  clientId: z.coerce.number().int().positive(),
  title: z.string().trim().min(2).max(160),
  weeks: z.coerce.number().int().min(1).max(52),
  startsOn: z.string().date(),
  status: z.enum(["draft", "active"]),
  exercises: z.array(z.object({
    exerciseId: z.coerce.number().int().positive(),
    day: z.string().trim().min(2).max(80),
    sets: z.coerce.number().int().min(1).max(20),
    reps: z.string().trim().min(1).max(30),
    rpe: z.coerce.number().min(1).max(10),
    restSeconds: z.coerce.number().int().min(0).max(1200),
  })).min(1),
});

const recordIdSchema = z.coerce.number().int().positive();

function optionalNumber(value: FormDataEntryValue | null) {
  return value === null || String(value).trim() === "" ? undefined : value;
}

function safeJson(value: FormDataEntryValue | null): unknown {
  try { return JSON.parse(String(value || "[]")); } catch { return null; }
}

export async function createMealTemplateAction(
  _previous: PlanActionState,
  formData: FormData,
): Promise<PlanActionState> {
  await requireRole("coach");
  const parsed = mealTemplateSchema.safeParse({
    name: formData.get("name"),
    mealType: formData.get("meal_type"),
    calories: optionalNumber(formData.get("calories")),
    protein: optionalNumber(formData.get("protein_g")),
    carbs: optionalNumber(formData.get("carbs_g")),
    fat: optionalNumber(formData.get("fat_g")),
    ingredients: formData.get("ingredients"),
    instructions: formData.get("instructions") || undefined,
    mediaUrl: String(formData.get("media_url") || "").trim(),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message || "Check the meal details." };

  await database()("meal_library").insert({
    name: parsed.data.name,
    meal_type: parsed.data.mealType,
    calories: parsed.data.calories ?? null,
    protein_g: parsed.data.protein ?? null,
    carbs_g: parsed.data.carbs ?? null,
    fat_g: parsed.data.fat ?? null,
    ingredients: parsed.data.ingredients,
    instructions: parsed.data.instructions || null,
    media_url: parsed.data.mediaUrl || null,
    is_active: true,
  });
  revalidatePath("/coach/diet-plans");
  return { success: `${parsed.data.name} was added to the meal library.` };
}

export async function createExerciseAction(
  _previous: PlanActionState,
  formData: FormData,
): Promise<PlanActionState> {
  await requireRole("coach");
  const parsed = exerciseSchema.safeParse({
    name: formData.get("name"),
    muscleGroup: formData.get("muscle_group"),
    equipment: formData.get("equipment"),
    difficulty: formData.get("difficulty"),
    motionType: formData.get("motion_type"),
    mediaUrl: String(formData.get("media_url") || "").trim(),
    instructions: formData.get("instructions") || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message || "Check the exercise details." };

  await database()("exercise_library").insert({
    name: parsed.data.name,
    muscle_group: parsed.data.muscleGroup,
    equipment: parsed.data.equipment,
    difficulty: parsed.data.difficulty,
    motion_type: parsed.data.motionType,
    media_url: parsed.data.mediaUrl || null,
    instructions: parsed.data.instructions || null,
    is_active: true,
  });
  revalidatePath("/coach/workout-plans");
  return { success: `${parsed.data.name} was added to the exercise library.` };
}

export async function addStarterExercisesAction(
  _previous: PlanActionState,
  formData: FormData,
): Promise<PlanActionState> {
  await requireRole("coach");
  const raw = safeJson(formData.get("names"));
  const requested = Array.isArray(raw) ? raw.map(String) : [];
  const pool = requested.length ? STARTER_EXERCISES.filter((exercise) => requested.includes(exercise.name)) : STARTER_EXERCISES;
  if (pool.length === 0) return { error: "No starter exercises were selected." };

  const db = database();
  const existing = await db("exercise_library").select("name");
  const existingNames = new Set(existing.map((row) => String(row.name).toLowerCase()));
  const toInsert = pool.filter((exercise) => !existingNames.has(exercise.name.toLowerCase()));
  if (toInsert.length === 0) return { success: "Those exercises are already in your library." };

  await db("exercise_library").insert(toInsert.map((exercise) => ({
    name: exercise.name,
    muscle_group: exercise.muscle_group,
    equipment: exercise.equipment,
    difficulty: exercise.difficulty,
    motion_type: exercise.motion_type,
    media_url: exercise.media_url,
    instructions: exercise.instructions,
    is_active: true,
  })));
  revalidatePath("/coach/workout-plans");
  return { success: `Added ${toInsert.length} starter exercise${toInsert.length === 1 ? "" : "s"} with demos.` };
}

export async function createDietPlanAction(
  _previous: PlanActionState,
  formData: FormData,
): Promise<PlanActionState> {
  await requireRole("coach");
  const parsed = dietPlanSchema.safeParse({
    clientId: formData.get("client_id"),
    title: formData.get("title"),
    calories: formData.get("daily_calories"),
    protein: optionalNumber(formData.get("protein_g")),
    carbs: optionalNumber(formData.get("carbs_g")),
    fat: optionalNumber(formData.get("fat_g")),
    startsOn: formData.get("starts_on"),
    status: formData.get("status"),
    meals: safeJson(formData.get("meals_json")),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message || "Add at least one valid meal." };

  const db = database();
  const [client, mealRows] = await Promise.all([
    db("clients").select("id").where({ id: parsed.data.clientId }).first(),
    db("meal_library").whereIn("id", [...new Set(parsed.data.meals.map((meal) => meal.mealId))]).where({ is_active: true }),
  ]);
  if (!client) return { error: "The selected client does not exist." };
  if (mealRows.length !== new Set(parsed.data.meals.map((meal) => meal.mealId)).size) return { error: "A selected meal is unavailable." };

  const mealsById = new Map(mealRows.map((meal) => [Number(meal.id), meal]));
  const meals = parsed.data.meals.map((selection) => {
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
  });

  await db.transaction(async (trx) => {
    if (parsed.data.status === "active") await trx("diet_plans").where({ client_id: client.id, status: "active" }).update({ status: "archived" });
    const latest = await trx("diet_plans").where({ client_id: client.id, title: parsed.data.title }).max({ version: "version" }).first();
    await trx("diet_plans").insert({
      client_id: client.id,
      title: parsed.data.title,
      version: Number(latest?.version || 0) + 1,
      daily_calories: parsed.data.calories,
      protein_g: parsed.data.protein ?? null,
      carbs_g: parsed.data.carbs ?? null,
      fat_g: parsed.data.fat ?? null,
      meals: JSON.stringify(meals),
      food_swaps: JSON.stringify([]),
      status: parsed.data.status,
      starts_on: parsed.data.startsOn,
    });
  });
  revalidatePath("/coach/diet-plans");
  revalidatePath("/client");
  revalidatePath("/client/diet-plan");
  revalidatePath("/client/workout-plan");
  return { success: `${parsed.data.title} was assigned to the client.` };
}

export async function createWorkoutPlanAction(
  _previous: PlanActionState,
  formData: FormData,
): Promise<PlanActionState> {
  await requireRole("coach");
  const parsed = workoutPlanSchema.safeParse({
    clientId: formData.get("client_id"),
    title: formData.get("title"),
    weeks: formData.get("weeks"),
    startsOn: formData.get("starts_on"),
    status: formData.get("status"),
    exercises: safeJson(formData.get("exercises_json")),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message || "Add at least one valid exercise." };

  const db = database();
  const exerciseIds = [...new Set(parsed.data.exercises.map((exercise) => exercise.exerciseId))];
  const [client, exerciseRows] = await Promise.all([
    db("clients").select("id").where({ id: parsed.data.clientId }).first(),
    db("exercise_library").whereIn("id", exerciseIds).where({ is_active: true }),
  ]);
  if (!client) return { error: "The selected client does not exist." };
  if (exerciseRows.length !== exerciseIds.length) return { error: "A selected exercise is unavailable." };

  const exercisesById = new Map(exerciseRows.map((exercise) => [Number(exercise.id), exercise]));
  const exercises = parsed.data.exercises.map((selection) => {
    const exercise = exercisesById.get(selection.exerciseId);
    return {
      exercise_id: selection.exerciseId,
      day: selection.day,
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
  });
  const weeklySplit = [...new Set(exercises.map((exercise) => exercise.day))];

  await db.transaction(async (trx) => {
    if (parsed.data.status === "active") await trx("workout_plans").where({ client_id: client.id, status: "active" }).update({ status: "archived" });
    const latest = await trx("workout_plans").where({ client_id: client.id, title: parsed.data.title }).max({ version: "version" }).first();
    await trx("workout_plans").insert({
      client_id: client.id,
      title: parsed.data.title,
      version: Number(latest?.version || 0) + 1,
      weeks: parsed.data.weeks,
      weekly_split: JSON.stringify(weeklySplit),
      exercises: JSON.stringify(exercises),
      status: parsed.data.status,
      starts_on: parsed.data.startsOn,
    });
  });
  revalidatePath("/coach/workout-plans");
  revalidatePath("/client");
  revalidatePath("/client/diet-plan");
  revalidatePath("/client/workout-plan");
  return { success: `${parsed.data.title} was assigned to the client.` };
}

export async function updateMealTemplateAction(
  _previous: PlanActionState,
  formData: FormData,
): Promise<PlanActionState> {
  await requireRole("coach");
  const id = recordIdSchema.safeParse(formData.get("id"));
  const parsed = mealTemplateSchema.safeParse({
    name: formData.get("name"),
    mealType: formData.get("meal_type"),
    calories: optionalNumber(formData.get("calories")),
    protein: optionalNumber(formData.get("protein_g")),
    carbs: optionalNumber(formData.get("carbs_g")),
    fat: optionalNumber(formData.get("fat_g")),
    ingredients: formData.get("ingredients"),
    instructions: formData.get("instructions") || undefined,
    mediaUrl: String(formData.get("media_url") || "").trim(),
  });
  if (!id.success) return { error: "The selected meal is invalid." };
  if (!parsed.success) return { error: parsed.error.issues[0]?.message || "Check the meal details." };
  const db = database();
  const record = await db("meal_library").select("id").where({ id: id.data }).first();
  if (!record) return { error: "The meal no longer exists." };
  await db("meal_library").where({ id: id.data }).update({
    name: parsed.data.name,
    meal_type: parsed.data.mealType,
    calories: parsed.data.calories ?? null,
    protein_g: parsed.data.protein ?? null,
    carbs_g: parsed.data.carbs ?? null,
    fat_g: parsed.data.fat ?? null,
    ingredients: parsed.data.ingredients,
    instructions: parsed.data.instructions || null,
    media_url: parsed.data.mediaUrl || null,
    updated_at: db.fn.now(),
  });
  revalidatePath("/coach/diet-plans");
  return { success: `${parsed.data.name} was updated.` };
}

export async function deleteMealTemplateAction(
  _previous: PlanActionState,
  formData: FormData,
): Promise<PlanActionState> {
  await requireRole("coach");
  const id = recordIdSchema.safeParse(formData.get("id"));
  if (!id.success) return { error: "The selected meal is invalid." };
  const db = database();
  const record = await db("meal_library").select("id", "name").where({ id: id.data }).first();
  if (!record) return { error: "The meal no longer exists." };
  await db("meal_library").where({ id: id.data }).del();
  revalidatePath("/coach/diet-plans");
  return { success: `${record.name} was deleted.` };
}

export async function updateExerciseAction(
  _previous: PlanActionState,
  formData: FormData,
): Promise<PlanActionState> {
  await requireRole("coach");
  const id = recordIdSchema.safeParse(formData.get("id"));
  const parsed = exerciseSchema.safeParse({
    name: formData.get("name"),
    muscleGroup: formData.get("muscle_group"),
    equipment: formData.get("equipment"),
    difficulty: formData.get("difficulty"),
    motionType: formData.get("motion_type"),
    mediaUrl: String(formData.get("media_url") || "").trim(),
    instructions: formData.get("instructions") || undefined,
  });
  if (!id.success) return { error: "The selected exercise is invalid." };
  if (!parsed.success) return { error: parsed.error.issues[0]?.message || "Check the exercise details." };
  const db = database();
  const record = await db("exercise_library").select("id").where({ id: id.data }).first();
  if (!record) return { error: "The exercise no longer exists." };
  await db("exercise_library").where({ id: id.data }).update({
    name: parsed.data.name,
    muscle_group: parsed.data.muscleGroup,
    equipment: parsed.data.equipment,
    difficulty: parsed.data.difficulty,
    motion_type: parsed.data.motionType,
    media_url: parsed.data.mediaUrl || null,
    instructions: parsed.data.instructions || null,
    updated_at: db.fn.now(),
  });
  revalidatePath("/coach/workout-plans");
  return { success: `${parsed.data.name} was updated.` };
}

export async function deleteExerciseAction(
  _previous: PlanActionState,
  formData: FormData,
): Promise<PlanActionState> {
  await requireRole("coach");
  const id = recordIdSchema.safeParse(formData.get("id"));
  if (!id.success) return { error: "The selected exercise is invalid." };
  const db = database();
  const record = await db("exercise_library").select("id", "name").where({ id: id.data }).first();
  if (!record) return { error: "The exercise no longer exists." };
  await db("exercise_library").where({ id: id.data }).del();
  revalidatePath("/coach/workout-plans");
  return { success: `${record.name} was deleted.` };
}

export async function updateDietPlanAction(
  _previous: PlanActionState,
  formData: FormData,
): Promise<PlanActionState> {
  await requireRole("coach");
  const id = recordIdSchema.safeParse(formData.get("id"));
  const parsed = dietPlanSchema.safeParse({
    clientId: formData.get("client_id"),
    title: formData.get("title"),
    calories: formData.get("daily_calories"),
    protein: optionalNumber(formData.get("protein_g")),
    carbs: optionalNumber(formData.get("carbs_g")),
    fat: optionalNumber(formData.get("fat_g")),
    startsOn: formData.get("starts_on"),
    status: formData.get("status"),
    meals: safeJson(formData.get("meals_json")),
  });
  if (!id.success) return { error: "The selected diet plan is invalid." };
  if (!parsed.success) return { error: parsed.error.issues[0]?.message || "Add at least one valid meal." };
  const db = database();
  const mealIds = [...new Set(parsed.data.meals.map((meal) => meal.mealId))];
  const [record, client, mealRows] = await Promise.all([
    db("diet_plans").select("id").where({ id: id.data }).first(),
    db("clients").select("id").where({ id: parsed.data.clientId }).first(),
    db("meal_library").whereIn("id", mealIds).where({ is_active: true }),
  ]);
  if (!record) return { error: "The diet plan no longer exists." };
  if (!client) return { error: "The selected client does not exist." };
  if (mealRows.length !== mealIds.length) return { error: "A selected meal is unavailable." };
  const mealsById = new Map(mealRows.map((meal) => [Number(meal.id), meal]));
  const meals = parsed.data.meals.map((selection) => {
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
  });
  await db.transaction(async (trx) => {
    if (parsed.data.status === "active") {
      await trx("diet_plans").where({ client_id: client.id, status: "active" }).whereNot({ id: id.data }).update({ status: "archived" });
    }
    await trx("diet_plans").where({ id: id.data }).update({
      client_id: client.id,
      title: parsed.data.title,
      daily_calories: parsed.data.calories,
      protein_g: parsed.data.protein ?? null,
      carbs_g: parsed.data.carbs ?? null,
      fat_g: parsed.data.fat ?? null,
      meals: JSON.stringify(meals),
      status: parsed.data.status,
      starts_on: parsed.data.startsOn,
      updated_at: trx.fn.now(),
    });
  });
  revalidatePath("/coach/diet-plans");
  revalidatePath("/client");
  revalidatePath("/client/diet-plan");
  revalidatePath("/client/workout-plan");
  return { success: `${parsed.data.title} was updated.` };
}

export async function deleteDietPlanAction(
  _previous: PlanActionState,
  formData: FormData,
): Promise<PlanActionState> {
  await requireRole("coach");
  const id = recordIdSchema.safeParse(formData.get("id"));
  if (!id.success) return { error: "The selected diet plan is invalid." };
  const db = database();
  const record = await db("diet_plans").select("id", "title").where({ id: id.data }).first();
  if (!record) return { error: "The diet plan no longer exists." };
  await db("diet_plans").where({ id: id.data }).del();
  revalidatePath("/coach/diet-plans");
  revalidatePath("/client");
  revalidatePath("/client/diet-plan");
  revalidatePath("/client/workout-plan");
  return { success: `${record.title} was deleted.` };
}

export async function updateWorkoutPlanAction(
  _previous: PlanActionState,
  formData: FormData,
): Promise<PlanActionState> {
  await requireRole("coach");
  const id = recordIdSchema.safeParse(formData.get("id"));
  const parsed = workoutPlanSchema.safeParse({
    clientId: formData.get("client_id"),
    title: formData.get("title"),
    weeks: formData.get("weeks"),
    startsOn: formData.get("starts_on"),
    status: formData.get("status"),
    exercises: safeJson(formData.get("exercises_json")),
  });
  if (!id.success) return { error: "The selected workout plan is invalid." };
  if (!parsed.success) return { error: parsed.error.issues[0]?.message || "Add at least one valid exercise." };
  const db = database();
  const exerciseIds = [...new Set(parsed.data.exercises.map((exercise) => exercise.exerciseId))];
  const [record, client, exerciseRows] = await Promise.all([
    db("workout_plans").select("id").where({ id: id.data }).first(),
    db("clients").select("id").where({ id: parsed.data.clientId }).first(),
    db("exercise_library").whereIn("id", exerciseIds).where({ is_active: true }),
  ]);
  if (!record) return { error: "The workout plan no longer exists." };
  if (!client) return { error: "The selected client does not exist." };
  if (exerciseRows.length !== exerciseIds.length) return { error: "A selected exercise is unavailable." };
  const exercisesById = new Map(exerciseRows.map((exercise) => [Number(exercise.id), exercise]));
  const exercises = parsed.data.exercises.map((selection) => {
    const exercise = exercisesById.get(selection.exerciseId);
    return {
      exercise_id: selection.exerciseId,
      day: selection.day,
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
  });
  const weeklySplit = [...new Set(exercises.map((exercise) => exercise.day))];
  await db.transaction(async (trx) => {
    if (parsed.data.status === "active") {
      await trx("workout_plans").where({ client_id: client.id, status: "active" }).whereNot({ id: id.data }).update({ status: "archived" });
    }
    await trx("workout_plans").where({ id: id.data }).update({
      client_id: client.id,
      title: parsed.data.title,
      weeks: parsed.data.weeks,
      weekly_split: JSON.stringify(weeklySplit),
      exercises: JSON.stringify(exercises),
      status: parsed.data.status,
      starts_on: parsed.data.startsOn,
      updated_at: trx.fn.now(),
    });
  });
  revalidatePath("/coach/workout-plans");
  revalidatePath("/client");
  revalidatePath("/client/diet-plan");
  revalidatePath("/client/workout-plan");
  return { success: `${parsed.data.title} was updated.` };
}

export async function deleteWorkoutPlanAction(
  _previous: PlanActionState,
  formData: FormData,
): Promise<PlanActionState> {
  await requireRole("coach");
  const id = recordIdSchema.safeParse(formData.get("id"));
  if (!id.success) return { error: "The selected workout plan is invalid." };
  const db = database();
  const record = await db("workout_plans").select("id", "title").where({ id: id.data }).first();
  if (!record) return { error: "The workout plan no longer exists." };
  await db("workout_plans").where({ id: id.data }).del();
  revalidatePath("/coach/workout-plans");
  revalidatePath("/client");
  revalidatePath("/client/diet-plan");
  revalidatePath("/client/workout-plan");
  return { success: `${record.title} was deleted.` };
}
