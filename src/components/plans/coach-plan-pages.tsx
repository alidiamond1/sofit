import { Apple, Dumbbell } from "lucide-react";
import { requireRole } from "@/lib/auth/session";
import { database } from "@/lib/db";
import { Badge, Card, PageHeader } from "@/components/dashboard/primitives";
import { DietPlanBuilder, WorkoutPlanBuilder, type ExerciseOption, type MealOption, type PlanClient } from "./plan-builders";
import { DietPlanRecordActions, WorkoutPlanRecordActions } from "./plan-record-actions";

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
  const db = database();
  const [clientRows, mealRows, plans] = await Promise.all([
    clients(),
    db("meal_library").select("id", "name", "meal_type", "calories", "protein_g", "carbs_g", "fat_g", "ingredients", "instructions").where({ is_active: true }).orderByRaw("FIELD(meal_type, 'breakfast', 'lunch', 'dinner', 'snack')").orderBy("name"),
    db("diet_plans").select("diet_plans.*", "users.name as client").join("clients", "clients.id", "diet_plans.client_id").join("users", "users.id", "clients.user_id").orderBy("diet_plans.updated_at", "desc"),
  ]);
  const meals = mealRows.map((row) => ({
    ...row,
    id: Number(row.id),
    calories: row.calories == null ? null : Number(row.calories),
    protein_g: row.protein_g == null ? null : Number(row.protein_g),
    carbs_g: row.carbs_g == null ? null : Number(row.carbs_g),
    fat_g: row.fat_g == null ? null : Number(row.fat_g),
  })) as MealOption[];

  return (
    <>
      <PageHeader eyebrow="Nutrition workspace" title="Diet plans" description="Build reusable meals, organize them as breakfast, lunch, dinner, or snacks, and assign a complete plan to a client." />
      <DietPlanBuilder clients={clientRows} meals={meals} defaultDate={defaultDate()} />
      <div className="section-row"><div><span className="eyebrow">Assigned plans</span><h2>Diet plan history</h2></div><Badge>{plans.length} plans</Badge></div>
      {plans.length === 0 ? <Card className="empty-state"><Apple size={24} /><h3>No diet plans yet</h3><p>Create the first plan above.</p></Card> : <Card><div className="data-table-wrap"><table className="data-table"><thead><tr><th>Plan</th><th>Client</th><th>Version</th><th>Calories</th><th>Status</th><th>Starts</th><th className="actions-column">Actions</th></tr></thead><tbody>{plans.map((plan) => <tr key={plan.id}><td><strong>{plan.title}</strong></td><td>{plan.client}</td><td>{plan.version}</td><td>{plan.daily_calories || "-"}</td><td><Badge tone={statusTone(plan.status)}>{plan.status}</Badge></td><td>{plan.starts_on ? dateOnly.format(new Date(plan.starts_on)) : "-"}</td><td className="actions-column"><DietPlanRecordActions plan={{ id: Number(plan.id), client_id: Number(plan.client_id), title: plan.title, version: Number(plan.version), daily_calories: plan.daily_calories == null ? null : Number(plan.daily_calories), protein_g: plan.protein_g == null ? null : Number(plan.protein_g), carbs_g: plan.carbs_g == null ? null : Number(plan.carbs_g), fat_g: plan.fat_g == null ? null : Number(plan.fat_g), starts_on: inputDate(plan.starts_on), status: plan.status, meals: plan.meals }} clients={clientRows} meals={meals} /></td></tr>)}</tbody></table></div></Card>}
    </>
  );
}

export async function CoachWorkoutPlansPage() {
  await requireRole("coach");
  const db = database();
  const [clientRows, exerciseRows, plans] = await Promise.all([
    clients(),
    db("exercise_library").select("id", "name", "muscle_group", "equipment", "difficulty", "motion_type", "media_url", "instructions").where({ is_active: true }).orderBy("muscle_group").orderBy("name"),
    db("workout_plans").select("workout_plans.*", "users.name as client").join("clients", "clients.id", "workout_plans.client_id").join("users", "users.id", "clients.user_id").orderBy("workout_plans.updated_at", "desc"),
  ]);
  const exercises = exerciseRows.map((row) => ({ ...row, id: Number(row.id) })) as ExerciseOption[];

  return (
    <>
      <PageHeader eyebrow="Training workspace" title="Workout plans" description="Build your own exercise library with animated character guidance, then compose and assign complete programs." />
      <WorkoutPlanBuilder clients={clientRows} exercises={exercises} defaultDate={defaultDate()} />
      <div className="section-row"><div><span className="eyebrow">Assigned programs</span><h2>Workout plan history</h2></div><Badge>{plans.length} plans</Badge></div>
      {plans.length === 0 ? <Card className="empty-state"><Dumbbell size={24} /><h3>No workout plans yet</h3><p>Create the first program above.</p></Card> : <Card><div className="data-table-wrap"><table className="data-table"><thead><tr><th>Program</th><th>Client</th><th>Version</th><th>Weeks</th><th>Status</th><th>Starts</th><th className="actions-column">Actions</th></tr></thead><tbody>{plans.map((plan) => <tr key={plan.id}><td><strong>{plan.title}</strong></td><td>{plan.client}</td><td>{plan.version}</td><td>{plan.weeks}</td><td><Badge tone={statusTone(plan.status)}>{plan.status}</Badge></td><td>{plan.starts_on ? dateOnly.format(new Date(plan.starts_on)) : "-"}</td><td className="actions-column"><WorkoutPlanRecordActions plan={{ id: Number(plan.id), client_id: Number(plan.client_id), title: plan.title, version: Number(plan.version), weeks: Number(plan.weeks), starts_on: inputDate(plan.starts_on), status: plan.status, exercises: plan.exercises }} clients={clientRows} exercises={exercises} /></td></tr>)}</tbody></table></div></Card>}
    </>
  );
}
