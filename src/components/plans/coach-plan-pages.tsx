import { Apple, Dumbbell } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { requireRole } from "@/lib/auth/session";
import { database } from "@/lib/db";
import { jsonArray, todayISO } from "@/lib/schedule";
import type { PlanHistoryRecord } from "@/lib/plan-history";
import { PlanHistory } from "./plan-history";
import { Badge, Card, PageHeader } from "@/components/dashboard/primitives";
import { SectionTabs } from "@/components/dashboard/section-tabs";
import { DietPlanBuilder, WorkoutPlanBuilder, type ExerciseOption, type MealOption, type PlanClient } from "./plan-builders";
import { DietPlanRecordActions, WorkoutPlanRecordActions } from "./plan-record-actions";
import { DietGroupsWorkspace, WorkoutGroupsWorkspace, type DietGroupSummary, type WorkoutGroupSummary } from "./plan-groups";

function defaultDate() {
  const date = new Date();
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60_000).toISOString().slice(0, 10);
}

function inputDate(value: unknown) {
  if (!value) return defaultDate();
  const date = new Date(String(value));
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60_000).toISOString().slice(0, 10);
}

async function planHistory(plans: Array<Record<string, unknown>>, kind: "diet" | "workout"): Promise<PlanHistoryRecord[]> {
  const logs = plans.length ? await database()("plan_completions")
    .select("client_id", "plan_id", "item_key", "scheduled_on")
    .where({ plan_type: kind }).whereIn("plan_id", plans.map((plan) => Number(plan.id))) : [];
  const datesByItem = new Map<string, string[]>();
  for (const log of logs) {
    const key = `${log.client_id}:${log.plan_id}:${log.item_key}`;
    const dates = datesByItem.get(key) || [];
    dates.push(inputDate(log.scheduled_on));
    datesByItem.set(key, dates);
  }
  return plans.map((plan) => {
    const days = jsonArray(plan.days);
    const items: Array<Record<string, unknown>> = kind === "workout" ? jsonArray(plan.exercises) : days.length
      ? days.flatMap((day) => jsonArray(day.meals).map((meal) => ({ ...meal, day: day.dayLabel })))
      : jsonArray(plan.meals);
    return {
      id: Number(plan.id), clientId: Number(plan.client_id), client: String(plan.client),
      title: String(plan.title), version: Number(plan.version), status: String(plan.status),
      startsOn: plan.starts_on ? inputDate(plan.starts_on) : "",
      metric: (kind === "diet" ? plan.daily_calories : plan.weeks) == null ? null : Number(kind === "diet" ? plan.daily_calories : plan.weeks),
      items: items.map((item, index) => {
        // Match the keys used by the client plan logging views, including legacy items.
        // ponytail: repeated library items share logs; separate slots when completion keys include occurrence IDs.
        const key = String((kind === "diet" ? item.meal_id : item.exercise_id) ?? index);
        return { key, name: String(item.name || item.exercise || "—"), day: String(item.day || ""), dates: datesByItem.get(`${plan.client_id}:${plan.id}:${key}`) || [] };
      }),
    };
  });
}

async function clients(): Promise<PlanClient[]> {
  const rows = await database()("clients")
    .select("clients.id", "users.name", "users.email")
    .join("users", "users.id", "clients.user_id")
    .whereNot("clients.status", "churned")
    .orderBy("users.name");
  return rows.map((row) => ({ id: Number(row.id), name: row.name, email: row.email }));
}

export async function CoachDietPlansPage() {
  await requireRole("coach");
  const t = await getTranslations("Packages.dietPlans");
  const db = database();
  const [clientRows, mealRows, plans, dietGroupRows] = await Promise.all([
    clients(),
    db("meal_library").select("id", "name", "meal_type", "calories", "protein_g", "carbs_g", "fat_g", "ingredients", "instructions", "media_url").where({ is_active: true }).orderByRaw("FIELD(meal_type, 'breakfast', 'lunch', 'dinner', 'snack')").orderBy("name"),
    db("diet_plans").select("diet_plans.*", "users.name as client").join("clients", "clients.id", "diet_plans.client_id").join("users", "users.id", "clients.user_id").orderBy("diet_plans.updated_at", "desc"),
    db("diet_groups").select("id", "name", "description", "days", "is_active").orderBy("name"),
  ]);
  const meals = mealRows.map((row) => ({
    ...row,
    id: Number(row.id),
    calories: row.calories == null ? null : Number(row.calories),
    protein_g: row.protein_g == null ? null : Number(row.protein_g),
    carbs_g: row.carbs_g == null ? null : Number(row.carbs_g),
    fat_g: row.fat_g == null ? null : Number(row.fat_g),
  })) as MealOption[];
  const dietGroups: DietGroupSummary[] = dietGroupRows.map((row) => ({
    id: Number(row.id),
    name: String(row.name),
    description: String(row.description || ""),
    isActive: Boolean(row.is_active),
    days: Array.isArray(row.days) ? row.days : [],
  }));

  const history = await planHistory(plans, "diet");

  const builderContent = (
    <>
      <DietPlanBuilder clients={clientRows} meals={meals} defaultDate={defaultDate()} />
      <div className="section-row"><div><span className="eyebrow">{t("assignedPlansEyebrow")}</span><h2>{t("history")}</h2></div><Badge>{t("plansCount", { count: plans.length })}</Badge></div>
      {plans.length === 0 ? <Card className="empty-state"><Apple size={24} /><h3>{t("noPlansTitle")}</h3><p>{t("noPlansHint")}</p></Card> : <PlanHistory kind="diet" today={todayISO("Africa/Nairobi")} plans={history.map((record, index) => {
        const plan = plans[index];
        return { ...record, actions: <DietPlanRecordActions plan={{ id: Number(plan.id), client_id: Number(plan.client_id), title: plan.title, version: Number(plan.version), daily_calories: plan.daily_calories == null ? null : Number(plan.daily_calories), protein_g: plan.protein_g == null ? null : Number(plan.protein_g), carbs_g: plan.carbs_g == null ? null : Number(plan.carbs_g), fat_g: plan.fat_g == null ? null : Number(plan.fat_g), starts_on: inputDate(plan.starts_on), status: plan.status, meals: plan.meals }} clients={clientRows} meals={meals} /> };
      })} />}
    </>
  );

  return (
    <>
      <PageHeader eyebrow={t("eyebrow")} title={t("title")} description={t("description")} />
      <SectionTabs
        tabs={[
          { id: "builder", label: t("tabBuilder"), content: builderContent },
          { id: "groups", label: t("tabGroups"), content: <DietGroupsWorkspace meals={meals} groups={dietGroups} /> },
        ]}
      />
    </>
  );
}

export async function CoachWorkoutPlansPage() {
  await requireRole("coach");
  const t = await getTranslations("Packages.workoutPlans");
  const db = database();
  const [clientRows, exerciseRows, plans, workoutGroupRows] = await Promise.all([
    clients(),
    db("exercise_library").select("id", "name", "muscle_group", "equipment", "difficulty", "motion_type", "media_url", "instructions").where({ is_active: true }).orderBy("muscle_group").orderBy("name"),
    db("workout_plans").select("workout_plans.*", "users.name as client").join("clients", "clients.id", "workout_plans.client_id").join("users", "users.id", "clients.user_id").orderBy("workout_plans.updated_at", "desc"),
    db("workout_groups").select("id", "name", "description", "days", "is_active").orderBy("name"),
  ]);
  const exercises = exerciseRows.map((row) => ({ ...row, id: Number(row.id) })) as ExerciseOption[];
  const workoutGroups: WorkoutGroupSummary[] = workoutGroupRows.map((row) => ({
    id: Number(row.id),
    name: String(row.name),
    description: String(row.description || ""),
    isActive: Boolean(row.is_active),
    days: Array.isArray(row.days) ? row.days : [],
  }));

  const history = await planHistory(plans, "workout");

  const builderContent = (
    <>
      <WorkoutPlanBuilder clients={clientRows} exercises={exercises} defaultDate={defaultDate()} />
      <div className="section-row"><div><span className="eyebrow">{t("assignedPlansEyebrow")}</span><h2>{t("history")}</h2></div><Badge>{t("plansCount", { count: plans.length })}</Badge></div>
      {plans.length === 0 ? <Card className="empty-state"><Dumbbell size={24} /><h3>{t("noPlansTitle")}</h3><p>{t("noPlansHint")}</p></Card> : <PlanHistory kind="workout" today={todayISO("Africa/Nairobi")} plans={history.map((record, index) => {
        const plan = plans[index];
        return { ...record, actions: <WorkoutPlanRecordActions plan={{ id: Number(plan.id), client_id: Number(plan.client_id), title: plan.title, version: Number(plan.version), weeks: Number(plan.weeks), starts_on: inputDate(plan.starts_on), status: plan.status, exercises: plan.exercises }} clients={clientRows} exercises={exercises} /> };
      })} />}
    </>
  );

  return (
    <>
      <PageHeader eyebrow={t("eyebrow")} title={t("title")} description={t("description")} />
      <SectionTabs
        tabs={[
          { id: "builder", label: t("tabBuilder"), content: builderContent },
          { id: "groups", label: t("tabGroups"), content: <WorkoutGroupsWorkspace exercises={exercises} groups={workoutGroups} /> },
        ]}
      />
    </>
  );
}
