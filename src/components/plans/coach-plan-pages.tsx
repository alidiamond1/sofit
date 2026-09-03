import { Apple, Dumbbell } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { requireRole } from "@/lib/auth/session";
import { database } from "@/lib/db";
import { statusLabel } from "@/lib/status-labels";
import { Badge, Card, PageHeader } from "@/components/dashboard/primitives";
import { SectionTabs } from "@/components/dashboard/section-tabs";
import { DietPlanBuilder, WorkoutPlanBuilder, type ExerciseOption, type MealOption, type PlanClient } from "./plan-builders";
import { DietPlanRecordActions, WorkoutPlanRecordActions } from "./plan-record-actions";
import { DietGroupsWorkspace, WorkoutGroupsWorkspace, type DietGroupSummary, type WorkoutGroupSummary } from "./plan-groups";

const dateOnly = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" });

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

function statusTone(status: string): "success" | "warning" | "neutral" {
  if (status === "active") return "success";
  if (status === "draft") return "warning";
  return "neutral";
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
  const ts = await getTranslations("Common.status");
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

  const builderContent = (
    <>
      <DietPlanBuilder clients={clientRows} meals={meals} defaultDate={defaultDate()} />
      <div className="section-row"><div><span className="eyebrow">{t("assignedPlansEyebrow")}</span><h2>{t("history")}</h2></div><Badge>{t("plansCount", { count: plans.length })}</Badge></div>
      {plans.length === 0 ? <Card className="empty-state"><Apple size={24} /><h3>{t("noPlansTitle")}</h3><p>{t("noPlansHint")}</p></Card> : <Card><div className="data-table-wrap"><table className="data-table"><thead><tr><th>{t("colPlan")}</th><th>{t("colClient")}</th><th>{t("colVersion")}</th><th>{t("colCalories")}</th><th>{t("colStatus")}</th><th>{t("colStarts")}</th><th className="actions-column">{t("colActions")}</th></tr></thead><tbody>{plans.map((plan) => <tr key={plan.id}><td><strong>{plan.title}</strong></td><td>{plan.client}</td><td>{plan.version}</td><td>{plan.daily_calories || "-"}</td><td><Badge tone={statusTone(plan.status)}>{statusLabel(ts, plan.status)}</Badge></td><td>{plan.starts_on ? dateOnly.format(new Date(plan.starts_on)) : "-"}</td><td className="actions-column"><DietPlanRecordActions plan={{ id: Number(plan.id), client_id: Number(plan.client_id), title: plan.title, version: Number(plan.version), daily_calories: plan.daily_calories == null ? null : Number(plan.daily_calories), protein_g: plan.protein_g == null ? null : Number(plan.protein_g), carbs_g: plan.carbs_g == null ? null : Number(plan.carbs_g), fat_g: plan.fat_g == null ? null : Number(plan.fat_g), starts_on: inputDate(plan.starts_on), status: plan.status, meals: plan.meals }} clients={clientRows} meals={meals} /></td></tr>)}</tbody></table></div></Card>}
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
  const ts = await getTranslations("Common.status");
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

  const builderContent = (
    <>
      <WorkoutPlanBuilder clients={clientRows} exercises={exercises} defaultDate={defaultDate()} />
      <div className="section-row"><div><span className="eyebrow">{t("assignedPlansEyebrow")}</span><h2>{t("history")}</h2></div><Badge>{t("plansCount", { count: plans.length })}</Badge></div>
      {plans.length === 0 ? <Card className="empty-state"><Dumbbell size={24} /><h3>{t("noPlansTitle")}</h3><p>{t("noPlansHint")}</p></Card> : <Card><div className="data-table-wrap"><table className="data-table"><thead><tr><th>{t("colProgram")}</th><th>{t("colClient")}</th><th>{t("colVersion")}</th><th>{t("colWeeks")}</th><th>{t("colStatus")}</th><th>{t("colStarts")}</th><th className="actions-column">{t("colActions")}</th></tr></thead><tbody>{plans.map((plan) => <tr key={plan.id}><td><strong>{plan.title}</strong></td><td>{plan.client}</td><td>{plan.version}</td><td>{plan.weeks}</td><td><Badge tone={statusTone(plan.status)}>{statusLabel(ts, plan.status)}</Badge></td><td>{plan.starts_on ? dateOnly.format(new Date(plan.starts_on)) : "-"}</td><td className="actions-column"><WorkoutPlanRecordActions plan={{ id: Number(plan.id), client_id: Number(plan.client_id), title: plan.title, version: Number(plan.version), weeks: Number(plan.weeks), starts_on: inputDate(plan.starts_on), status: plan.status, exercises: plan.exercises }} clients={clientRows} exercises={exercises} /></td></tr>)}</tbody></table></div></Card>}
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
