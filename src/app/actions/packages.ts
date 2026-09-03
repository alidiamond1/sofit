"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/auth/session";
import { database } from "@/lib/db";
import { todayISO } from "@/lib/schedule";
import { PACKAGE_BILLING_INTERVALS, PACKAGE_CATEGORIES } from "@/lib/package-tiers";

export type PackageActionState = { error?: string; success?: string };

const recordIdSchema = z.coerce.number().int().positive();

function optionalId(value: FormDataEntryValue | null) {
  return value === null || String(value).trim() === "" ? undefined : value;
}

const packageSchema = z.object({
  name: z.string().trim().min(2, "Package name is required.").max(120),
  category: z.enum(PACKAGE_CATEGORIES),
  description: z.string().trim().max(2000).optional(),
  price: z.coerce.number().min(0, "Price cannot be negative.").max(1_000_000),
  billingInterval: z.enum(PACKAGE_BILLING_INTERVALS),
  isActive: z.enum(["true", "false"]),
  dietGroupId: recordIdSchema.optional(),
  workoutGroupId: recordIdSchema.optional(),
});

function packageInput(formData: FormData) {
  return packageSchema.safeParse({
    name: formData.get("name"),
    category: formData.get("category"),
    description: formData.get("description") || "",
    price: formData.get("price"),
    billingInterval: formData.get("billing_interval"),
    isActive: formData.get("is_active"),
    dietGroupId: optionalId(formData.get("diet_group_id")),
    workoutGroupId: optionalId(formData.get("workout_group_id")),
  });
}

function refreshPackageViews() {
  revalidatePath("/coach/packages");
  revalidatePath("/coach/clients");
  revalidatePath("/client");
}

async function assertGroupsExist(dietGroupId: number | undefined, workoutGroupId: number | undefined) {
  const db = database();
  if (dietGroupId) {
    const row = await db("diet_groups").select("id").where({ id: dietGroupId }).first();
    if (!row) return "The selected diet group does not exist.";
  }
  if (workoutGroupId) {
    const row = await db("workout_groups").select("id").where({ id: workoutGroupId }).first();
    if (!row) return "The selected workout group does not exist.";
  }
  return null;
}

export async function createPackageAction(
  _previous: PackageActionState,
  formData: FormData,
): Promise<PackageActionState> {
  await requireRole("coach");
  const parsed = packageInput(formData);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message || "Check the package details." };

  const groupError = await assertGroupsExist(parsed.data.dietGroupId, parsed.data.workoutGroupId);
  if (groupError) return { error: groupError };

  const db = database();
  await db("packages").insert({
    name: parsed.data.name,
    category: parsed.data.category,
    description: parsed.data.description || null,
    price: parsed.data.price,
    billing_interval: parsed.data.billingInterval,
    is_active: parsed.data.isActive === "true",
    diet_group_id: parsed.data.dietGroupId ?? null,
    workout_group_id: parsed.data.workoutGroupId ?? null,
  });
  refreshPackageViews();
  return { success: `${parsed.data.name} was created.` };
}

export async function updatePackageAction(
  _previous: PackageActionState,
  formData: FormData,
): Promise<PackageActionState> {
  await requireRole("coach");
  const id = recordIdSchema.safeParse(formData.get("id"));
  const parsed = packageInput(formData);
  if (!id.success) return { error: "The selected package is invalid." };
  if (!parsed.success) return { error: parsed.error.issues[0]?.message || "Check the package details." };

  const groupError = await assertGroupsExist(parsed.data.dietGroupId, parsed.data.workoutGroupId);
  if (groupError) return { error: groupError };

  const db = database();
  const record = await db("packages").select("id").where({ id: id.data }).first();
  if (!record) return { error: "The package no longer exists." };

  await db("packages").where({ id: id.data }).update({
    name: parsed.data.name,
    category: parsed.data.category,
    description: parsed.data.description || null,
    price: parsed.data.price,
    billing_interval: parsed.data.billingInterval,
    is_active: parsed.data.isActive === "true",
    diet_group_id: parsed.data.dietGroupId ?? null,
    workout_group_id: parsed.data.workoutGroupId ?? null,
    updated_at: db.fn.now(),
  });
  refreshPackageViews();
  return { success: `${parsed.data.name} was updated.` };
}

export async function deletePackageAction(
  _previous: PackageActionState,
  formData: FormData,
): Promise<PackageActionState> {
  await requireRole("coach");
  const id = recordIdSchema.safeParse(formData.get("id"));
  if (!id.success) return { error: "The selected package is invalid." };

  const db = database();
  const record = await db("packages").select("id", "name").where({ id: id.data }).first();
  if (!record) return { error: "The package no longer exists." };

  // clients.package_id references packages with ON DELETE SET NULL, so any client
  // currently labeled with this package simply loses that label — nothing else breaks.
  await db("packages").where({ id: id.data }).del();
  refreshPackageViews();
  return { success: `${record.name} was deleted.` };
}

const assignSchema = z.object({
  clientId: z.coerce.number().int().positive(),
  packageId: z.coerce.number().int().positive(),
});

type GroupDay = { dayIndex: number; dayLabel: string; meals?: unknown[]; exercises?: unknown[] };

export async function assignPackageAction(
  _previous: PackageActionState,
  formData: FormData,
): Promise<PackageActionState> {
  await requireRole("coach");
  const parsed = assignSchema.safeParse({
    clientId: formData.get("client_id"),
    packageId: formData.get("package_id"),
  });
  if (!parsed.success) return { error: "Choose both a client and a package." };

  const db = database();
  const [client, pkg] = await Promise.all([
    db("clients").select("id", "user_id").where({ id: parsed.data.clientId }).first(),
    db("packages").where({ id: parsed.data.packageId, is_active: true }).first(),
  ]);
  if (!client) return { error: "The selected client does not exist." };
  if (!pkg) return { error: "That package is not available." };
  if (!pkg.diet_group_id && !pkg.workout_group_id) return { error: "This package has no diet or workout group attached yet." };

  const [dietGroup, workoutGroup] = await Promise.all([
    pkg.diet_group_id ? db("diet_groups").where({ id: pkg.diet_group_id }).first() : Promise.resolve(null),
    pkg.workout_group_id ? db("workout_groups").where({ id: pkg.workout_group_id }).first() : Promise.resolve(null),
  ]);
  if (pkg.diet_group_id && !dietGroup) return { error: "The linked diet group no longer exists." };
  if (pkg.workout_group_id && !workoutGroup) return { error: "The linked workout group no longer exists." };

  const dietDays: GroupDay[] = dietGroup && Array.isArray(dietGroup.days) ? dietGroup.days : [];
  const workoutDays: GroupDay[] = workoutGroup && Array.isArray(workoutGroup.days) ? workoutGroup.days : [];
  const totalMeals = dietDays.reduce((sum, day) => sum + (day.meals?.length || 0), 0);
  const totalExercises = workoutDays.reduce((sum, day) => sum + (day.exercises?.length || 0), 0);
  if (totalMeals === 0 && totalExercises === 0) return { error: "This package's groups do not have any content yet." };

  await db.transaction(async (trx) => {
    const settingsRow = await trx("user_settings").select("timezone").where({ user_id: client.user_id }).first();
    const today = todayISO(String(settingsRow?.timezone || "Africa/Nairobi"));

    let dietPlanId: number | null = null;
    if (totalMeals > 0) {
      await trx("diet_plans").where({ client_id: client.id, status: "active" }).update({ status: "archived" });
      const latestDiet = await trx("diet_plans").where({ client_id: client.id, title: pkg.name }).max({ version: "version" }).first();
      [dietPlanId] = await trx("diet_plans").insert({
        client_id: client.id,
        title: pkg.name,
        version: Number(latestDiet?.version || 0) + 1,
        meals: null,
        days: JSON.stringify(dietDays.map((day) => ({ dayIndex: day.dayIndex, dayLabel: day.dayLabel, meals: day.meals || [] }))),
        food_swaps: JSON.stringify([]),
        status: "active",
        starts_on: today,
      });
    }

    let workoutPlanId: number | null = null;
    if (totalExercises > 0) {
      await trx("workout_plans").where({ client_id: client.id, status: "active" }).update({ status: "archived" });
      const latestWorkout = await trx("workout_plans").where({ client_id: client.id, title: pkg.name }).max({ version: "version" }).first();
      const exercises = workoutDays.flatMap((day) => day.exercises || []);
      const weeklySplit = workoutDays.filter((day) => (day.exercises?.length || 0) > 0).map((day) => day.dayLabel);
      [workoutPlanId] = await trx("workout_plans").insert({
        client_id: client.id,
        title: pkg.name,
        version: Number(latestWorkout?.version || 0) + 1,
        weeks: 4,
        weekly_split: JSON.stringify(weeklySplit),
        exercises: JSON.stringify(exercises),
        status: "active",
        starts_on: today,
      });
    }

    // Diet and workout groups can cover different weekdays independently (they are
    // built separately), so the week schedule is filled in per-content-type rather
    // than assuming both line up on the same days like the older tier_packages flow.
    const byDayIndex = new Map<number, { dayLabel: string; hasMeals: boolean; hasExercises: boolean }>();
    for (const day of dietDays) {
      const existing = byDayIndex.get(day.dayIndex) || { dayLabel: day.dayLabel, hasMeals: false, hasExercises: false };
      existing.hasMeals = (day.meals?.length || 0) > 0;
      byDayIndex.set(day.dayIndex, existing);
    }
    for (const day of workoutDays) {
      const existing = byDayIndex.get(day.dayIndex) || { dayLabel: day.dayLabel, hasMeals: false, hasExercises: false };
      existing.hasExercises = (day.exercises?.length || 0) > 0;
      byDayIndex.set(day.dayIndex, existing);
    }
    for (let weekday = 0; weekday < 7; weekday += 1) {
      const day = byDayIndex.get(weekday);
      const slot = day && (day.hasMeals || day.hasExercises)
        ? {
            is_rest: false,
            diet_plan_id: day.hasMeals ? dietPlanId : null,
            workout_plan_id: day.hasExercises ? workoutPlanId : null,
            workout_day: day.hasExercises ? day.dayLabel : null,
          }
        : { is_rest: true, diet_plan_id: null, workout_plan_id: null, workout_day: null };
      await trx("client_week_schedule")
        .insert({ client_id: client.id, weekday, ...slot })
        .onConflict(["client_id", "weekday"])
        .merge(slot);
    }

    await trx("clients").where({ id: client.id }).update({ package_id: pkg.id, updated_at: trx.fn.now() });
  });

  revalidatePath("/coach/packages");
  revalidatePath("/coach/diet-plans");
  revalidatePath("/coach/workout-plans");
  revalidatePath("/coach/schedule");
  revalidatePath("/coach/clients");
  revalidatePath("/client");
  revalidatePath("/client/diet-plan");
  revalidatePath("/client/workout-plan");
  revalidatePath("/client/sessions");
  return {
    success: totalMeals > 0 && totalExercises > 0
      ? `${pkg.name} was assigned — this week's diet and workout were built automatically.`
      : totalMeals > 0
        ? `${pkg.name} was assigned — this week's diet was built automatically.`
        : `${pkg.name} was assigned — this week's workout was built automatically.`,
  };
}
