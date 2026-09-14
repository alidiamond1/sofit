import {
  Activity,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Dumbbell,
  Mail,
  Moon,
  Scale,
  UserRound,
  Utensils,
} from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { requireRole } from "@/lib/auth/session";
import { getBilling, snapshotOf } from "@/lib/payments/billing";
import { isOpenClientPath } from "@/lib/payments/rules";
import { LockedClientHome, LockedProgram, PaymentsPage } from "@/components/payments/payments-page";
import { currentWeekStart } from "@/lib/check-in-week";
import { database } from "@/lib/db";
import { hasAnyProgressPhoto, parseProgressPhotos } from "@/lib/progress-photos";
import { statusLabel } from "@/lib/status-labels";
import { HorizontalBars, TrendLineChart } from "./charts";
import { CheckInForm } from "./check-in-form";
import { ProgressPhotoTimeline } from "./progress-photos";
import { Badge, Card, CardHead, PageHeader, StatCard } from "./primitives";
import { WorkoutExerciseLogList, DietMealLogList, PlanCardShell } from "@/components/plans/client-plan-views";
import { TodayWorkout } from "@/components/schedule/today-workout";
import { MonthCalendar, type DaySchedule } from "@/components/schedule/month-calendar";
import { WEEKDAYS, exercisesForDay, todayISO, weekdayIndex } from "@/lib/schedule";
import { AccountProfilePage, AccountSettingsPage } from "@/components/profile/account-pages";
import { BodyMetricsPage } from "@/components/profile/body-metrics-page";
import { calculateBmi, adultBmiEligible } from "@/lib/body-metrics";
import { MessagingWorkspace } from "@/components/messages/messaging-workspace";
import { loadClientMessageThreads } from "@/lib/messages";
import { ClientWalking, ClientWalkingHome } from "@/components/plans/walking-pages";

export const realClientSections = ["plans", "diet-plan", "workout-plan", "walking", "sessions", "check-in", "progress", "messages", "payments", "health", "profile", "settings"];

const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
const dateTime = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
const dateOnly = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" });

function numeric(value: unknown) {
  return Number(value || 0);
}

function jsonArray(value: unknown): Array<Record<string, unknown>> {
  if (Array.isArray(value)) return value as Array<Record<string, unknown>>;
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch { return []; }
  }
  return [];
}

function tone(status: string): "success" | "warning" | "danger" | "neutral" | "blue" {
  if (["active", "approved", "paid", "attended", "reviewed", "completed"].includes(status)) return "success";
  if (["overdue", "rejected", "cancelled", "no_show", "churned"].includes(status)) return "danger";
  if (["pending", "submitted", "paused", "unpaid", "draft", "scheduled"].includes(status)) return "warning";
  return "neutral";
}

async function EmptyState({ text }: { text: string }) {
  const t = await getTranslations("Common");
  return <Card className="empty-state"><ClipboardList size={24} /><h3>{t("noRecordsYet")}</h3><p>{text}</p></Card>;
}

async function ProfileCompletionNudge({ client }: { client: { height_cm: unknown; starting_weight_kg: unknown; date_of_birth: unknown } }) {
  if (calculateBmi(client.height_cm, client.starting_weight_kg) !== null && client.date_of_birth) return null;
  const t = await getTranslations("Common.profileNudge");
  return (
    <Card className="profile-nudge-card">
      <span className="profile-nudge-icon"><UserRound size={20} /></span>
      <div>
        <strong>{t("title")}</strong>
        <p>{t("body")}</p>
      </div>
      <Link className="button primary" href="/client/health">{t("cta")}</Link>
    </Card>
  );
}

/** MySQL DATE columns come back as local-midnight Date objects; re-read the
 *  parts with local getters so this never drifts a day via UTC conversion. */
function normalizeDate(value: unknown): string {
  if (value instanceof Date) {
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, "0");
    const day = String(value.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }
  return String(value).slice(0, 10);
}

export type PlanCompletionRow = { item_key: string; scheduled_on: unknown; details: unknown };

async function getClientContext() {
  const session = await requireRole("client");
  const client = await database()("clients")
    .select(
      "clients.*",
      "users.name",
      "users.email",
      "users.created_at as account_created_at",
      "services.name as service_name",
      "services.type as service_type",
      "services.tier as service_tier",
      "services.price as service_price",
      "services.billing_interval as service_billing_interval",
      "packages.id as package_id",
      "packages.name as package_name",
      "packages.category as package_category",
      "packages.description as package_description",
      "packages.price as package_price",
      "packages.billing_interval as package_billing_interval",
      "invites.intake_answers",
    )
    .join("users", "users.id", "clients.user_id")
    .leftJoin("services", "services.id", "clients.service_id")
    .leftJoin("packages", "packages.id", "clients.package_id")
    .leftJoin("invites", "invites.user_id", "users.id")
    .where("users.id", session.id)
    .first();
  if (!client) redirect("/login");
  return { session, client };
}

async function ClientHome() {
  const { client } = await getClientContext();
  const t = await getTranslations("ClientHome");
  const ta = await getTranslations("Account");
  const tc = await getTranslations("Common");
  const ts = await getTranslations("Common.status");
  const now = new Date();
  const [dietPlan, workoutPlan, nextSession, recentCheckIns, openInvoice, packageServices] = await Promise.all([
    database()("diet_plans").where({ client_id: client.id, status: "active", invoice_id: client.current_invoice_id }).orderBy("updated_at", "desc").first(),
    database()("workout_plans").where({ client_id: client.id, status: "active", invoice_id: client.current_invoice_id }).orderBy("updated_at", "desc").first(),
    database()("sessions").where({ client_id: client.id, attendance: "scheduled" }).where("starts_at", ">=", now).orderBy("starts_at").first(),
    database()("check_ins").where({ client_id: client.id }).orderBy("week_of", "desc").limit(8),
    database()("invoices").where({ client_id: client.id }).whereIn("status", ["unpaid", "overdue"]).orderBy("due_on").first(),
    client.package_id
      ? database()("package_services")
          .select("package_services.quantity", "services.name", "services.type", "services.tier")
          .join("services", "services.id", "package_services.service_id")
          .where("package_services.package_id", client.package_id)
          .orderBy("services.type")
      : Promise.resolve([]),
  ]);
  const latestCheckIn = recentCheckIns[0];
  const progressTrend = [...recentCheckIns]
    .reverse()
    .filter((item) => item.weight_kg != null)
    .map((item) => ({
      label: new Date(item.week_of).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      value: numeric(item.weight_kg),
    }));

  const settingsRow = await database()("user_settings").select("timezone").where({ user_id: client.user_id }).first();
  const clientTz = String(settingsRow?.timezone || "Africa/Nairobi");
  let scheduleReady = true;
  let isRestToday = false;
  let todayPlanTitle = "";
  let todayDayLabel: string | null = null;
  let todayExercises: Array<{ key: string; name: string; muscleGroup: string; equipment: string; difficulty: string; mediaUrl: string | null; day: string; sets: string; reps: string; rpe: string; restSeconds: number; instructions: string | null; done: boolean }> = [];
  try {
    const weekday = weekdayIndex(clientTz);
    const today = todayISO(clientTz);
    const scheduleSlot = await database()("client_week_schedule").where({ client_id: client.id, weekday }).first();

    let plan: { title: unknown; exercises: unknown } | undefined;
    let dayLabel: string | null = null;

    if (scheduleSlot) {
      isRestToday = Boolean(scheduleSlot.is_rest);
      if (!scheduleSlot.is_rest && scheduleSlot.workout_plan_id) {
        plan = await database()("workout_plans").select("title", "exercises").where({ id: scheduleSlot.workout_plan_id, client_id: client.id, invoice_id: client.current_invoice_id }).first();
        dayLabel = scheduleSlot.workout_day ? String(scheduleSlot.workout_day) : null;
      }
    } else {
      // No explicit schedule row — fall back to the active plan's day-tagged
      // split (this is how Packages-assigned plans show up without a coach
      // ever touching the manual /coach/schedule builder).
      const activeWorkout = await database()("workout_plans").select("title", "exercises").where({ client_id: client.id, status: "active", invoice_id: client.current_invoice_id }).first();
      const label = WEEKDAYS[weekday];
      if (activeWorkout && exercisesForDay(activeWorkout.exercises, label).length > 0) {
        plan = activeWorkout;
        dayLabel = label;
      }
    }

    if (plan) {
      const completions = await database()("workout_completions").select("exercise_key").where({ client_id: client.id, scheduled_on: today });
      const doneKeys = new Set(completions.map((row) => String(row.exercise_key)));
      todayPlanTitle = String(plan.title);
      todayDayLabel = dayLabel;
      todayExercises = exercisesForDay(plan.exercises, dayLabel).map((exercise) => ({
        key: exercise.key,
        name: exercise.name,
        muscleGroup: exercise.muscleGroup,
        equipment: exercise.equipment,
        difficulty: exercise.difficulty,
        mediaUrl: exercise.mediaUrl,
        day: dayLabel || "",
        sets: exercise.sets,
        reps: exercise.reps,
        rpe: exercise.rpe,
        restSeconds: exercise.restSeconds,
        instructions: exercise.instructions,
        done: doneKeys.has(exercise.key),
      }));
    }
  } catch {
    // Schedule tables not migrated yet — Home still renders without the Today card.
    scheduleReady = false;
  }

  const dietVersionLine = dietPlan
    ? (dietPlan.daily_calories
        ? t("kcalVersionLine", { calories: dietPlan.daily_calories, version: dietPlan.version })
        : t("dietPlanVersionLine", { version: dietPlan.version }))
    : "";
  const workoutVersionLine = workoutPlan ? t("weeksVersionLine", { weeks: workoutPlan.weeks, version: workoutPlan.version }) : "";

  return (
    <>
      <PageHeader
        eyebrow={client.package_name || client.service_name || ta("sofitClient")}
        title={t("welcomeTitle", { name: client.name })}
        description={t("description")}
      />
      <ProfileCompletionNudge client={client} />
      <ClientWalkingHome clientId={Number(client.id)} userId={Number(client.user_id)} />
      {client.package_name ? (
        <Card className="client-package-summary">
          <div>
            <span className="eyebrow">{t("yourPackage")}</span>
            <h2>{client.package_name}</h2>
            <p>{client.package_description || t("packageDescriptionFallback")}</p>
          </div>
          <div className="client-package-services">
            {packageServices.map((service) => <span key={service.name}>{service.quantity}x {service.name}</span>)}
          </div>
          <div className="client-package-price">
            <Badge tone="success">{client.package_category}</Badge>
            <strong>{money.format(numeric(client.package_price))}</strong>
            <span>{client.package_billing_interval}</span>
          </div>
        </Card>
      ) : null}
      {!scheduleReady ? null : todayExercises.length > 0 ? (
        <TodayWorkout exercises={todayExercises} planTitle={todayPlanTitle} dayLabel={todayDayLabel} />
      ) : isRestToday ? (
        <Card className="today-rest"><span className="today-rest-icon"><Moon size={20} /></span><div><strong>{t("restDayTitle")}</strong><span>{t("restDayBody")}</span></div></Card>
      ) : (
        <Card className="today-rest today-empty"><span className="today-rest-icon"><Dumbbell size={20} /></span><div><strong>{t("noWorkoutTitle")}</strong><span>{t("noWorkoutBody")}</span></div></Card>
      )}
      <div className="stats-grid">
        <StatCard label={t("statAccountStatus")} value={statusLabel(ts, client.status)} note={statusLabel(ts, client.pipeline_stage)} icon={<CheckCircle2 size={18} />} accent="green" />
        <StatCard label={t("statLatestWeight")} value={latestCheckIn?.weight_kg ? `${latestCheckIn.weight_kg} kg` : "-"} note={latestCheckIn ? dateOnly.format(new Date(latestCheckIn.week_of)) : t("noCheckInYet")} icon={<Scale size={18} />} points={progressTrend.map((point) => point.value)} />
        <StatCard label={t("dietAdherence")} value={latestCheckIn?.diet_adherence_pct != null ? `${latestCheckIn.diet_adherence_pct}%` : "-"} note={t("latestSubmittedWeek")} icon={<Utensils size={18} />} accent="green" />
        <StatCard label={t("workoutCompletion")} value={latestCheckIn?.workout_completion_pct != null ? `${latestCheckIn.workout_completion_pct}%` : "-"} note={t("latestSubmittedWeek")} icon={<Activity size={18} />} />
      </div>
      <div className="dashboard-insight-grid client-dashboard-insights">
        <Card className="chart-card">
          <CardHead title={t("yourMomentum")} meta={t("weightTrendMeta")} />
          <TrendLineChart data={progressTrend} valueLabel={t("weightLabel")} formatValue={(value) => `${value} kg`} highestLabel={tc("chartHighest")} latestLabel={tc("chartLatest")} emptyLabel={tc("chartNoTrend")} />
        </Card>
        <Card className="chart-card">
          <CardHead title={t("weeklyConsistency")} meta={latestCheckIn ? dateOnly.format(new Date(latestCheckIn.week_of)) : t("awaitingFirstCheckIn")} action={<BarChart3 size={18} />} />
          <HorizontalBars
            valueLabel="%"
            emptyLabel={tc("chartNoCategory")}
            items={[
              { label: t("dietAdherence"), value: numeric(latestCheckIn?.diet_adherence_pct), detail: `${numeric(latestCheckIn?.diet_adherence_pct)}%` },
              { label: t("workoutCompletion"), value: numeric(latestCheckIn?.workout_completion_pct), detail: `${numeric(latestCheckIn?.workout_completion_pct)}%` },
              { label: t("energy"), value: numeric(latestCheckIn?.energy_score) * 10, detail: `${numeric(latestCheckIn?.energy_score)}/10` },
              { label: t("sleep"), value: numeric(latestCheckIn?.sleep_score) * 10, detail: `${numeric(latestCheckIn?.sleep_score)}/10` },
            ]}
          />
        </Card>
      </div>
      <div className="overview-grid">
        <Card>
          <CardHead title={t("currentPlans")} meta={t("assignedByCoach")} />
          <div className="simple-rows">
            {dietPlan ? <div><span className="task-icon mint"><Utensils size={16} /></span><div><strong>{dietPlan.title}</strong><span>{dietVersionLine}</span></div><Badge tone="success">{statusLabel(ts, dietPlan.status)}</Badge></div> : null}
            {workoutPlan ? <div><span className="task-icon mint"><Dumbbell size={16} /></span><div><strong>{workoutPlan.title}</strong><span>{workoutVersionLine}</span></div><Badge tone="success">{statusLabel(ts, workoutPlan.status)}</Badge></div> : null}
            {!dietPlan && !workoutPlan ? <div><span>{t("noPlanAssignedYet")}</span></div> : null}
          </div>
        </Card>
        <Card>
          <CardHead title={t("nextActions")} meta={t("liveAccountRecords")} />
          <div className="simple-rows">
            <div><span className="task-icon mint"><CalendarDays size={16} /></span><div><strong>{t("nextSession")}</strong><span>{nextSession ? dateTime.format(new Date(nextSession.starts_at)) : t("noSessionBooked")}</span></div></div>
            <div><span className="task-icon sand"><CheckCircle2 size={16} /></span><div><strong>{t("weeklyCheckIn")}</strong><span>{latestCheckIn ? t("lastSubmitted", { date: dateOnly.format(new Date(latestCheckIn.week_of)) }) : t("notSubmittedYet")}</span></div></div>
            <div><span className="task-icon rose"><Mail size={16} /></span><div><strong>{t("payment")}</strong><span>{openInvoice ? `${openInvoice.number} - ${money.format(numeric(openInvoice.amount))}` : t("noUnpaidInvoice")}</span></div></div>
          </div>
        </Card>
      </div>
    </>
  );
}

export async function DietPlanCard({ plan, today, completions, readOnly = false }: { plan: Record<string, unknown>; today: string; completions: PlanCompletionRow[]; readOnly?: boolean }) {
  const t = await getTranslations("ClientDietPlan");
  const ts = await getTranslations("Common.status");
  const days = jsonArray(plan.days);
  const meals: Array<Record<string, unknown>> = days.length
    ? days.flatMap((day) => jsonArray(day.meals).map((meal) => ({ ...meal, day: day.dayLabel } as Record<string, unknown>)))
    : jsonArray(plan.meals);
  const assignedOn = plan.starts_on || plan.created_at;
  const versionLine = t("versionLine", { version: String(plan.version) }) + (assignedOn ? t("assignedOnSuffix", { date: dateOnly.format(new Date(String(assignedOn))) }) : "");
  return (
    <Card className="client-detailed-plan">
      <PlanCardShell
        title={<div><Badge tone={tone(String(plan.status))}>{statusLabel(ts, String(plan.status))}</Badge><span>{versionLine}</span><h2>{String(plan.title)}</h2></div>}
        metrics={<div className="plan-metrics"><div><strong>{String(plan.daily_calories || "-")}</strong><span>{t("kcal")}</span></div><div><strong>{String(plan.protein_g || "-")}</strong><span>{t("proteinG")}</span></div><div><strong>{String(plan.carbs_g || "-")}</strong><span>{t("carbsG")}</span></div></div>}
      >
        <DietMealLogList
          today={today}
          readOnly={readOnly}
          meals={meals.map((meal, index) => {
            const key = String(meal.meal_id ?? index);
            const rows = completions.filter((row) => row.item_key === key);
            const history = rows.map((row) => normalizeDate(row.scheduled_on));
            return {
              name: String(meal.name || t("mealFallback")),
              type: String(meal.type || "meal"),
              time: String(meal.time || ""),
              calories: meal.calories ? String(meal.calories) : "",
              protein: meal.protein_g ? String(meal.protein_g) : "",
              carbs: meal.carbs_g ? String(meal.carbs_g) : "",
              fat: meal.fat_g ? String(meal.fat_g) : "",
              mediaUrl: meal.media_url ? String(meal.media_url) : null,
              ingredients: Array.isArray(meal.ingredients) ? meal.ingredients.map(String) : Array.isArray(meal.items) ? (meal.items as unknown[]).map(String) : [],
              instructions: meal.instructions ? String(meal.instructions) : null,
              day: meal.day ? String(meal.day) : undefined,
              key,
              dietPlanId: Number(plan.id),
              doneToday: history.includes(today),
              history,
            };
          })}
        />
      </PlanCardShell>
    </Card>
  );
}

export async function WorkoutPlanCard({ plan, today, completions, readOnly = false }: { plan: Record<string, unknown>; today: string; completions: PlanCompletionRow[]; readOnly?: boolean }) {
  const t = await getTranslations("ClientWorkoutPlan");
  const ts = await getTranslations("Common.status");
  const exercises = jsonArray(plan.exercises);
  const days = jsonArray(plan.weekly_split);
  const assignedOn = plan.starts_on || plan.created_at;
  const versionLine = t("versionLine", { version: String(plan.version) }) + (assignedOn ? t("assignedOnSuffix", { date: dateOnly.format(new Date(String(assignedOn))) }) : "");
  return (
    <Card className="client-detailed-plan training">
      <PlanCardShell
        title={<div><Badge tone={tone(String(plan.status))}>{statusLabel(ts, String(plan.status))}</Badge><span>{versionLine}</span><h2>{String(plan.title)}</h2></div>}
        metrics={<div className="plan-metrics"><div><strong>{String(plan.weeks || "-")}</strong><span>{t("weeks")}</span></div><div><strong>{days.length || new Set(exercises.map((item) => String(item.day))).size}</strong><span>{t("days")}</span></div><div><strong>{exercises.length}</strong><span>{t("exercises")}</span></div></div>}
      >
        <WorkoutExerciseLogList readOnly={readOnly} exercises={exercises.map((exercise, index) => {
          const key = String(exercise.exercise_id ?? index);
          const rows = completions
            .filter((row) => row.item_key === key)
            .map((row) => {
              const details = (typeof row.details === "string" ? safeParseJson(row.details) : row.details) as Record<string, unknown> | null;
              return {
                date: normalizeDate(row.scheduled_on),
                setsCompleted: details?.setsCompleted ? String(details.setsCompleted) : null,
                repsCompleted: details?.repsCompleted ? String(details.repsCompleted) : null,
                weightKg: details?.weightKg ? String(details.weightKg) : null,
                notes: details?.notes ? String(details.notes) : null,
              };
            })
            .sort((a, b) => (a.date < b.date ? 1 : -1));
          const todayEntry = rows.find((row) => row.date === today) || null;
          return {
            name: String(exercise.exercise || t("exerciseFallback")),
            muscleGroup: String(exercise.muscle_group || ""),
            equipment: String(exercise.equipment || "Bodyweight"),
            difficulty: String(exercise.difficulty || "beginner"),
            mediaUrl: exercise.media_url ? String(exercise.media_url) : null,
            day: String(exercise.day || t("trainingDayFallback")),
            sets: String(exercise.sets ?? "-"),
            reps: String(exercise.reps ?? "-"),
            rpe: String(exercise.rpe ?? "-"),
            restSeconds: Number(exercise.rest_seconds ?? 0),
            instructions: exercise.instructions ? String(exercise.instructions) : null,
            key,
            workoutPlanId: Number(plan.id),
            doneToday: Boolean(todayEntry),
            loggedToday: todayEntry,
            history: rows,
          };
        })} />
      </PlanCardShell>
    </Card>
  );
}

function safeParseJson(value: string): unknown {
  try { return JSON.parse(value); } catch { return null; }
}

async function ClientDietPlans() {
  const { client } = await getClientContext();
  const t = await getTranslations("ClientDietPlan");
  const settingsRow = await database()("user_settings").select("timezone").where({ user_id: client.user_id }).first();
  const today = todayISO(String(settingsRow?.timezone || "Africa/Nairobi"));
  const dietPlans = await database()("diet_plans").where({ client_id: client.id, invoice_id: client.current_invoice_id }).whereNot("status", "draft").orderBy("updated_at", "desc");
  const planIds = dietPlans.map((plan) => Number(plan.id));
  const completions: PlanCompletionRow[] = planIds.length
    ? await database()("plan_completions").select("plan_id", "item_key", "scheduled_on", "details").where({ client_id: client.id, plan_type: "diet" }).whereIn("plan_id", planIds)
    : [];
  const byPlan = new Map<number, PlanCompletionRow[]>();
  for (const row of completions as Array<PlanCompletionRow & { plan_id: number }>) {
    const list = byPlan.get(Number(row.plan_id)) || [];
    list.push(row);
    byPlan.set(Number(row.plan_id), list);
  }
  return <><PageHeader eyebrow={t("eyebrow")} title={t("title")} description={t("description")} />{dietPlans.length ? <div className="client-plan-stack">{dietPlans.map((plan) => <DietPlanCard key={plan.id} plan={plan} today={today} completions={byPlan.get(Number(plan.id)) || []} />)}</div> : <EmptyState text={t("emptyHint")} />}</>;
}

async function ClientWorkoutPlans() {
  const { client } = await getClientContext();
  const t = await getTranslations("ClientWorkoutPlan");
  const settingsRow = await database()("user_settings").select("timezone").where({ user_id: client.user_id }).first();
  const today = todayISO(String(settingsRow?.timezone || "Africa/Nairobi"));
  const workoutPlans = await database()("workout_plans").where({ client_id: client.id, invoice_id: client.current_invoice_id }).whereNot("status", "draft").orderBy("updated_at", "desc");
  const planIds = workoutPlans.map((plan) => Number(plan.id));
  const completions: PlanCompletionRow[] = planIds.length
    ? await database()("plan_completions").select("plan_id", "item_key", "scheduled_on", "details").where({ client_id: client.id, plan_type: "workout" }).whereIn("plan_id", planIds)
    : [];
  const byPlan = new Map<number, PlanCompletionRow[]>();
  for (const row of completions as Array<PlanCompletionRow & { plan_id: number }>) {
    const list = byPlan.get(Number(row.plan_id)) || [];
    list.push(row);
    byPlan.set(Number(row.plan_id), list);
  }
  return <><PageHeader eyebrow={t("eyebrow")} title={t("title")} description={t("description")} />{workoutPlans.length ? <div className="client-plan-stack">{workoutPlans.map((plan) => <WorkoutPlanCard key={plan.id} plan={plan} today={today} completions={byPlan.get(Number(plan.id)) || []} />)}</div> : <EmptyState text={t("emptyHint")} />}</>;
}

function toMealDetail(meal: Record<string, unknown>, mealFallback = "Meal") {
  return {
    name: String(meal.name || mealFallback),
    type: String(meal.type || "meal"),
    time: String(meal.time || ""),
    calories: meal.calories ? String(meal.calories) : "",
    protein: meal.protein_g ? String(meal.protein_g) : "",
    carbs: meal.carbs_g ? String(meal.carbs_g) : "",
    fat: meal.fat_g ? String(meal.fat_g) : "",
    mediaUrl: meal.media_url ? String(meal.media_url) : null,
    ingredients: Array.isArray(meal.ingredients) ? meal.ingredients.map(String) : Array.isArray(meal.items) ? (meal.items as unknown[]).map(String) : [],
    instructions: meal.instructions ? String(meal.instructions) : null,
  };
}

/** Meals for one weekday of a diet plan. Day-based plans (built via
 *  Packages) resolve by dayIndex; flat legacy plans only resolve when
 *  `requireDayMatch` is false (an explicit schedule row picked this day). */
function mealsForWeekday(plan: { days?: unknown; meals?: unknown } | undefined, weekday: number, requireDayMatch: boolean) {
  if (!plan) return [];
  const days = jsonArray(plan.days);
  if (days.length) {
    const entry = days.find((day) => Number(day.dayIndex) === weekday);
    return entry ? jsonArray(entry.meals) : [];
  }
  return requireDayMatch ? [] : jsonArray(plan.meals);
}

async function ClientSessions() {
  const { client } = await getClientContext();
  const t = await getTranslations("ClientSessions");
  const tm = await getTranslations("ClientDietPlan");
  const ts = await getTranslations("Common.status");
  const mealFallback = tm("mealFallback");
  const settingsRow = await database()("user_settings").select("timezone").where({ user_id: client.user_id }).first();
  const clientTz = String(settingsRow?.timezone || "Africa/Nairobi");
  const sessions = await database()("sessions")
    .select("sessions.*", "services.name as service")
    .leftJoin("services", "services.id", "sessions.service_id")
    .where("sessions.client_id", client.id)
    .orderBy("starts_at", "desc");

  const weekDays: DaySchedule[] = Array.from({ length: 7 }, (_, weekday) => ({ weekday, isRest: false, workout: null, diet: null }));
  const scheduledWeekdays = new Set<number>();
  try {
    const slots = await database()("client_week_schedule").where({ client_id: client.id });
    const workoutIds = [...new Set(slots.filter((slot) => slot.workout_plan_id).map((slot) => Number(slot.workout_plan_id)))];
    const dietIds = [...new Set(slots.filter((slot) => slot.diet_plan_id).map((slot) => Number(slot.diet_plan_id)))];
    const [workoutPlans, dietPlans] = await Promise.all([
      workoutIds.length ? database()("workout_plans").whereIn("id", workoutIds).where({ client_id: client.id, invoice_id: client.current_invoice_id }).select("id", "title", "exercises") : Promise.resolve([]),
      dietIds.length ? database()("diet_plans").whereIn("id", dietIds).where({ client_id: client.id, invoice_id: client.current_invoice_id }).select("id", "title", "meals", "days") : Promise.resolve([]),
    ]);
    const workoutById = new Map(workoutPlans.map((plan) => [Number(plan.id), plan]));
    const dietById = new Map(dietPlans.map((plan) => [Number(plan.id), plan]));
    for (const slot of slots) {
      const weekday = Number(slot.weekday);
      if (weekday < 0 || weekday > 6) continue;
      scheduledWeekdays.add(weekday);
      const isRest = Boolean(slot.is_rest);
      let workout: DaySchedule["workout"] = null;
      let diet: DaySchedule["diet"] = null;
      if (!isRest && slot.workout_plan_id) {
        const plan = workoutById.get(Number(slot.workout_plan_id));
        if (plan) {
          const dayLabel = slot.workout_day ? String(slot.workout_day) : null;
          workout = {
            title: String(plan.title),
            dayLabel,
            exercises: exercisesForDay(plan.exercises, dayLabel).map((exercise) => ({
              name: exercise.name,
              muscleGroup: exercise.muscleGroup,
              equipment: exercise.equipment,
              difficulty: exercise.difficulty,
              mediaUrl: exercise.mediaUrl,
              day: dayLabel || "",
              sets: exercise.sets,
              reps: exercise.reps,
              rpe: exercise.rpe,
              restSeconds: exercise.restSeconds,
              instructions: exercise.instructions,
            })),
          };
        }
      }
      if (!isRest && slot.diet_plan_id) {
        const plan = dietById.get(Number(slot.diet_plan_id));
        if (plan) {
          diet = { title: String(plan.title), meals: mealsForWeekday(plan, weekday, false).map((meal) => toMealDetail(meal, mealFallback)) };
        }
      }
      weekDays[weekday] = { weekday, isRest, workout, diet };
    }
  } catch {
    // schedule tables not migrated yet
  }

  // Fallback for weekdays with no explicit client_week_schedule row: derive
  // straight from the client's active plans, for day-tagged content only
  // (Packages always tags days as "Monday".."Sunday" — see DAY_LABELS).
  const remainingWeekdays = Array.from({ length: 7 }, (_, weekday) => weekday).filter((weekday) => !scheduledWeekdays.has(weekday));
  if (remainingWeekdays.length) {
    const [activeDiet, activeWorkout] = await Promise.all([
      database()("diet_plans").select("title", "days", "meals").where({ client_id: client.id, status: "active", invoice_id: client.current_invoice_id }).first(),
      database()("workout_plans").select("title", "exercises").where({ client_id: client.id, status: "active", invoice_id: client.current_invoice_id }).first(),
    ]);
    for (const weekday of remainingWeekdays) {
      const dayLabel = String(WEEKDAYS[weekday]);
      const dayMeals = mealsForWeekday(activeDiet, weekday, true);
      const dayExercises = activeWorkout ? exercisesForDay(activeWorkout.exercises, dayLabel) : [];
      if (!dayMeals.length && !dayExercises.length) continue;
      weekDays[weekday] = {
        weekday,
        isRest: false,
        workout: dayExercises.length
          ? {
              title: String(activeWorkout!.title),
              dayLabel,
              exercises: dayExercises.map((exercise) => ({
                name: exercise.name,
                muscleGroup: exercise.muscleGroup,
                equipment: exercise.equipment,
                difficulty: exercise.difficulty,
                mediaUrl: exercise.mediaUrl,
                day: dayLabel,
                sets: exercise.sets,
                reps: exercise.reps,
                rpe: exercise.rpe,
                restSeconds: exercise.restSeconds,
                instructions: exercise.instructions,
              })),
            }
          : null,
        diet: dayMeals.length ? { title: String(activeDiet!.title), meals: dayMeals.map((meal) => toMealDetail(meal, mealFallback)) } : null,
      };
    }
  }

  const dayFmt = new Intl.DateTimeFormat("en-CA", { timeZone: clientTz, year: "numeric", month: "2-digit", day: "2-digit" });
  const timeFmt = new Intl.DateTimeFormat("en-US", { timeZone: clientTz, hour: "numeric", minute: "2-digit" });
  const calendarSessions = sessions.map((item) => ({
    date: dayFmt.format(new Date(item.starts_at)),
    title: item.service || t("personalTrainingFallback"),
    time: timeFmt.format(new Date(item.starts_at)),
    status: String(item.attendance),
  }));

  return (
    <>
      <PageHeader title={t("title")} description={t("description")} />
      <MonthCalendar sessions={calendarSessions} weekDays={weekDays} today={todayISO(clientTz)} />
      {sessions.length === 0 ? <EmptyState text={t("noSessionsBooked")} /> : <Card><div className="data-table-wrap"><table className="data-table"><thead><tr><th>{t("colSession")}</th><th>{t("colDate")}</th><th>{t("colDuration")}</th><th>{t("colAttendance")}</th><th>{t("colNotes")}</th></tr></thead><tbody>{sessions.map((item) => <tr key={item.id}><td>{item.service || t("personalTrainingFallback")}</td><td>{dateTime.format(new Date(item.starts_at))}</td><td>{t("durationSuffix", { minutes: item.duration_minutes })}</td><td><Badge tone={tone(item.attendance)}>{statusLabel(ts, item.attendance)}</Badge></td><td>{item.notes || "-"}</td></tr>)}</tbody></table></div></Card>}
    </>
  );
}

async function ClientCheckIn() {
  const { client } = await getClientContext();
  const t = await getTranslations("ClientCheckIn");
  const ts = await getTranslations("Common.status");
  const latest = await database()("check_ins").where({ client_id: client.id }).orderBy("week_of", "desc").first();
  // If the client already has a submission open for the current week (e.g. they're
  // editing their numbers again), prefill the uploader with whatever photos they
  // already attached rather than making them re-upload.
  const thisWeek = latest && normalizeDate(latest.week_of) === currentWeekStart() ? latest : null;
  const initialPhotos = thisWeek ? parseProgressPhotos(thisWeek.progress_photos) : null;
  return (
    <>
      <PageHeader title={t("title")} description={t("description")} />
      <ProfileCompletionNudge client={client} />
      <div className="checkin-form-layout">
        <Card className="checkin-form">
          <CheckInForm initialPhotos={initialPhotos} heightCm={client.height_cm ? Number(client.height_cm) : null} showBmi={adultBmiEligible(normalizeDate(client.date_of_birth || ""))} initialWeight={String(thisWeek?.weight_kg ?? "")} />
        </Card>
        <Card><CardHead title={t("latestCheckIn")} meta={latest ? dateOnly.format(new Date(latest.week_of)) : t("noSubmission")} />{latest ? <div className="simple-rows"><div><strong>{t("weight")}</strong><Badge>{latest.weight_kg} kg</Badge></div><div><strong>{t("dietAdherence")}</strong><Badge tone="success">{latest.diet_adherence_pct}%</Badge></div><div><strong>{t("workoutCompletion")}</strong><Badge tone="blue">{latest.workout_completion_pct}%</Badge></div><div><strong>{t("status")}</strong><Badge tone={tone(latest.status)}>{statusLabel(ts, latest.status)}</Badge></div></div> : <p>{t("noCheckInStored")}</p>}</Card>
      </div>
    </>
  );
}

async function ClientProgress() {
  const { client } = await getClientContext();
  const t = await getTranslations("ClientProgress");
  const tc = await getTranslations("Common");
  const ts = await getTranslations("Common.status");
  const checkIns = await database()("check_ins").where({ client_id: client.id }).orderBy("week_of", "desc");
  const latest = checkIns[0];
  const chronological = [...checkIns].reverse();
  const weightTrend = chronological
    .filter((item) => item.weight_kg != null)
    .map((item) => ({ label: new Date(item.week_of).toLocaleDateString("en-US", { month: "short", day: "numeric" }), value: numeric(item.weight_kg) }));
  const adherenceTrend = chronological.map((item) => ({
    label: new Date(item.week_of).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    value: Math.round((numeric(item.diet_adherence_pct) + numeric(item.workout_completion_pct)) / 2),
  }));
  const photoWeeks = checkIns
    .map((item) => ({ key: String(item.id), weekLabel: dateOnly.format(new Date(item.week_of)), photos: parseProgressPhotos(item.progress_photos) }))
    .filter((entry) => hasAnyProgressPhoto(entry.photos));
  return (
    <>
      <PageHeader eyebrow={t("eyebrow")} title={t("title")} description={t("description")} />
      <div className="stats-grid compact">
        <StatCard label={t("currentWeight")} value={latest?.weight_kg ? `${latest.weight_kg} kg` : "-"} icon={<Scale size={18} />} points={weightTrend.map((point) => point.value)} />
        <StatCard label={t("dietAdherence")} value={latest?.diet_adherence_pct != null ? `${latest.diet_adherence_pct}%` : "-"} icon={<Utensils size={18} />} accent="green" />
        <StatCard label={t("workoutCompletion")} value={latest?.workout_completion_pct != null ? `${latest.workout_completion_pct}%` : "-"} icon={<Activity size={18} />} />
        <StatCard label={t("checkIns")} value={String(checkIns.length)} icon={<CheckCircle2 size={18} />} accent="green" />
      </div>
      {checkIns.length === 0 ? (
        <EmptyState text={t("emptyHint")} />
      ) : (
        <>
          <div className="progress-chart-grid">
            <Card className="chart-card"><CardHead title={t("weightTrend")} meta={t("weightTrendMeta")} /><TrendLineChart data={weightTrend} valueLabel={t("weightLabel")} formatValue={(value) => `${value} kg`} highestLabel={tc("chartHighest")} latestLabel={tc("chartLatest")} emptyLabel={tc("chartNoTrend")} /></Card>
            <Card className="chart-card"><CardHead title={t("adherenceTrend")} meta={t("adherenceTrendMeta")} /><TrendLineChart data={adherenceTrend} valueLabel={t("adherenceLabel")} formatValue={(value) => `${value}%`} highestLabel={tc("chartHighest")} latestLabel={tc("chartLatest")} emptyLabel={tc("chartNoTrend")} /></Card>
          </div>
          {photoWeeks.length > 0 ? (
            <Card className="chart-card">
              <CardHead title={t("photoTimelineTitle")} meta={t("photoTimelineMeta", { count: photoWeeks.length })} />
              <ProgressPhotoTimeline entries={photoWeeks} altPrefix={t("photoTimelineAltPrefix")} />
            </Card>
          ) : (
            <EmptyState text={t("photoTimelineEmptyHint")} />
          )}
          <Card>
            <CardHead title={t("checkInHistory")} meta={t("recordsCount", { count: checkIns.length })} />
            <div className="data-table-wrap"><table className="data-table"><thead><tr><th>{t("colWeek")}</th><th>{t("colWeight")}</th><th>{t("colDiet")}</th><th>{t("colWorkout")}</th><th>{t("colEnergy")}</th><th>{t("colSleep")}</th><th>{t("colStatus")}</th></tr></thead><tbody>{checkIns.map((item) => <tr key={item.id}><td>{dateOnly.format(new Date(item.week_of))}</td><td>{item.weight_kg || "-"} kg</td><td>{item.diet_adherence_pct ?? "-"}%</td><td>{item.workout_completion_pct ?? "-"}%</td><td>{item.energy_score ?? "-"}/10</td><td>{item.sleep_score ?? "-"}/10</td><td><Badge tone={tone(item.status)}>{statusLabel(ts, item.status)}</Badge></td></tr>)}</tbody></table></div>
          </Card>
        </>
      )}
    </>
  );
}

async function ClientMessages() {
  const { session } = await getClientContext();
  const t = await getTranslations("MessagesPanel");
  const threads = await loadClientMessageThreads(session.id);
  const unread = threads.reduce((total, thread) => total + thread.unreadCount, 0);
  return (
    <>
      <PageHeader
        eyebrow={t("clientEyebrow")}
        title={t("title")}
        description={t("clientDescription")}
        actions={<Badge tone={unread ? "blue" : "success"}>{unread ? t("unreadCount", { count: unread }) : t("upToDate")}</Badge>}
      />
      <MessagingWorkspace role="client" currentUserId={session.id} threads={threads} initialParticipantId={threads[0]?.participantId} />
    </>
  );
}


async function ClientProfile() {
  return <AccountProfilePage role="client" />;
}

async function ClientSettings() { return <AccountSettingsPage role="client" />; }

export async function RealClientSection({ section = "home", orderId }: { section?: string; orderId?: string }) {
  const session = await requireRole("client");
  const billing = await getBilling(session.id);
  if (!billing.unlocked && section === "home") return <LockedClientHome name={session.name} packageName={billing.invoice?.package_snapshot ? snapshotOf(billing.invoice.package_snapshot).name : undefined} />;
  if (!billing.unlocked && !isOpenClientPath(`/client/${section}`)) return <LockedProgram />;
  if (section === "home") return <ClientHome />;
  if (section === "plans") redirect("/client/diet-plan");
  if (section === "diet-plan") return <ClientDietPlans />;
  if (section === "workout-plan") return <ClientWorkoutPlans />;
  if (section === "walking") return <ClientWalking />;
  if (section === "sessions") return <ClientSessions />;
  if (section === "check-in") return <ClientCheckIn />;
  if (section === "progress") return <ClientProgress />;
  if (section === "messages") return <ClientMessages />;
  if (section === "payments") return <PaymentsPage orderId={orderId} />;
  if (section === "health") return <BodyMetricsPage />;
  if (section === "settings") return <ClientSettings />;
  return <ClientProfile />;
}
