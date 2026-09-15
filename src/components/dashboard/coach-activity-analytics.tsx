import Link from "next/link";
import { Dumbbell, Footprints, Sparkles, Utensils } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { requireRole } from "@/lib/auth/session";
import { database } from "@/lib/db";
import { todayISO } from "@/lib/schedule";
import { shiftWalkingDate, summarizeWalking, walkingTargetFromRow, type WalkingLog, type WalkingTarget } from "@/lib/walking";
import { statusLabel } from "@/lib/status-labels";
import { HealthChart } from "@/components/profile/health-chart";
import { Card, CardHead, StatCard } from "./primitives";
import { HorizontalBars, RingChart } from "./charts";

type CountRow = { key: string; total: number | string };
type MonthRow = { date: string; total: number | string };

export async function CoachActivityAnalytics() {
  const session = await requireRole("coach");
  const [t, ts, w] = await Promise.all([getTranslations("CoachingAnalytics"), getTranslations("Common.status"), getTranslations("Walking")]);
  const db = database();
  const settings = await db("user_settings").select("timezone").where({ user_id: session.id }).first();
  const today = todayISO(String(settings?.timezone || "Africa/Nairobi"));
  const firstMonth = new Date(`${today.slice(0, 7)}-01T12:00:00Z`);
  firstMonth.setUTCMonth(firstMonth.getUTCMonth() - 11);
  const since = firstMonth.toISOString().slice(0, 10);
  const months = Array.from({ length: 12 }, (_, index) => {
    const date = new Date(firstMonth); date.setUTCMonth(date.getUTCMonth() + index);
    return date.toISOString().slice(0, 10);
  });
  const counts = (table: string, column: string) => db(table).select({ key: column }).count<CountRow[]>({ total: "*" }).groupBy(column);
  const monthly = (table: string, column: string) => db(table).select(db.raw("DATE_FORMAT(??, '%Y-%m-01') as date", [column])).count<MonthRow[]>({ total: "*" })
    .where(column, ">=", since).where(column, "<", `${shiftWalkingDate(today, 1)} 00:00:00`).groupByRaw("DATE_FORMAT(??, '%Y-%m-01')", [column]);
  const [workoutStatuses, dietStatuses, workoutMonths, dietMonths, mealMonths, exerciseMonths, scheduledMonths,
    sessionStatuses, attendedMonths, missedMonths, consultationStatuses, converted, checkInMonths, submittedMonths, reviewedMonths,
    transformationStatuses, transformationMonths, targetRows, logRows] = await Promise.all([
    counts("workout_plans", "status"), counts("diet_plans", "status"), monthly("workout_plans", "created_at"), monthly("diet_plans", "created_at"),
    monthly("plan_completions", "scheduled_on").where("plan_type", "diet"), monthly("plan_completions", "scheduled_on").where("plan_type", "workout"), monthly("workout_completions", "scheduled_on"),
    counts("sessions", "attendance").whereBetween("starts_at", [since, `${today} 23:59:59`]),
    monthly("sessions", "starts_at").where("attendance", "attended"), monthly("sessions", "starts_at").where("attendance", "no_show"),
    counts("consultations", "status").whereBetween("starts_at", [since, `${today} 23:59:59`]),
    db("consultations").count({ total: "*" }).whereNotNull("converted_service_id").whereBetween("starts_at", [since, `${today} 23:59:59`]).first(),
    db("check_ins").select(db.raw("DATE_FORMAT(week_of, '%Y-%m-01') as date"))
      .avg<Array<{ date: string; diet: number | string | null; workout: number | string | null }>>({ diet: "diet_adherence_pct", workout: "workout_completion_pct" })
      .whereIn("status", ["submitted", "reviewed"]).whereBetween("week_of", [since, today]).groupByRaw("DATE_FORMAT(week_of, '%Y-%m-01')"),
    monthly("check_ins", "week_of").where("status", "submitted"), monthly("check_ins", "week_of").where("status", "reviewed"),
    counts("transformations", "is_published"), monthly("transformations", "created_at"),
    db("walking_targets").join("clients", "clients.id", "walking_targets.client_id").leftJoin("user_settings", "user_settings.user_id", "clients.user_id")
      .select("walking_targets.*", "user_settings.timezone"),
    db("walking_logs").select("client_id", "amount", db.raw("DATE_FORMAT(logged_on, '%Y-%m-%d') as date"))
      .whereBetween("logged_on", [shiftWalkingDate(today, -31), shiftWalkingDate(today, 1)]),
  ]);
  const clients = new Map<number, { targets: WalkingTarget[]; logs: WalkingLog[]; today: string }>();
  for (const row of targetRows) {
    const clientId = Number(row.client_id);
    const client = clients.get(clientId) || { targets: [], logs: [], today: todayISO(String(row.timezone || "Africa/Nairobi")) };
    client.targets.push(walkingTargetFromRow(row)); clients.set(clientId, client);
  }
  for (const row of logRows) clients.get(Number(row.client_id))?.logs.push({ date: String(row.date), amount: Number(row.amount), notes: "" });
  const walking = summarizeWalking([...clients.values()]);
  const chart = (rows: MonthRow[]) => months.map((date) => ({ date, value: Number(rows.find((row) => row.date === date)?.total || 0) }));
  const pair = (first: MonthRow[], second: MonthRow[]) => months.map((date) => ({ date, first: Number(first.find((row) => row.date === date)?.total || 0), second: Number(second.find((row) => row.date === date)?.total || 0) }));
  const total = (rows: CountRow[], key?: string) => rows.filter((row) => key === undefined || String(row.key) === key).reduce((sum, row) => sum + Number(row.total), 0);
  const segments = (rows: CountRow[]) => rows.map((row) => ({ label: statusLabel(ts, String(row.key)), value: Number(row.total), tone: row.key === "active" || row.key === "attended" ? "green" as const : "slate" as const }));
  const more = (href: string) => <Link className="text-button" href={href}>{t("viewRecords")}</Link>;
  return <div className="analytics-coaching-sections">
    <div className="analytics-kpi-grid">
      <StatCard label={t("activeWorkouts")} value={String(total(workoutStatuses, "active"))} note={t("planCountNote")} icon={<Dumbbell size={18} />} />
      <StatCard label={t("activeDiets")} value={String(total(dietStatuses, "active"))} note={t("planCountNote")} icon={<Utensils size={18} />} />
      <StatCard label={t("walkingAdherence")} value={walking.adherence === null ? "—" : `${walking.adherence}%`} note={t("walkingNote", { clients: walking.participatingClients, days: walking.completedDays })} icon={<Footprints size={18} />} />
      <StatCard label={t("publishedStories")} value={String(total(transformationStatuses, "1"))} note={t("storiesNote", { total: total(transformationStatuses) })} icon={<Sparkles size={18} />} />
    </div>
    <section id="analytics-plans" className="analytics-coaching-section"><h2>{t("plansTitle")}</h2><p>{t("plansHint")}</p><div className="analytics-coaching-grid">
      <Card><CardHead title={t("workoutStatus")} meta={t("workoutStatusSource")} action={more("/coach/workout-plans")} /><RingChart segments={segments(workoutStatuses)} centerValue={String(total(workoutStatuses))} centerLabel={t("plans")} /></Card>
      <Card><CardHead title={t("dietStatus")} meta={t("dietStatusSource")} action={more("/coach/diet-plans")} /><RingChart segments={segments(dietStatuses)} centerValue={String(total(dietStatuses))} centerLabel={t("plans")} /></Card>
      <Card><CardHead title={t("planDelivery")} meta={t("planDeliverySource")} action={more("/coach/assignments")} /><HealthChart emptyLabel={t("noRecords")} data={pair(workoutMonths, dietMonths)} series={[{ key: "first", label: t("workoutPlans") }, { key: "second", label: t("dietPlans") }]} /></Card>
      <Card><CardHead title={t("mealActivity")} meta={t("mealSource")} action={more("/coach/diet-plans")} /><HealthChart emptyLabel={t("noRecords")} data={chart(mealMonths)} series={[{ key: "value", label: t("mealActivity") }]} /></Card>
      <Card><CardHead title={t("workoutActivity")} meta={t("workoutSource")} action={more("/coach/workout-plans")} /><HealthChart emptyLabel={t("noRecords")} data={pair(exerciseMonths, scheduledMonths)} series={[{ key: "first", label: t("planLogs") }, { key: "second", label: t("scheduleLogs") }]} /></Card>
      <Card><CardHead title={t("adherenceTrend")} meta={t("adherenceSource")} action={more("/coach/check-ins")} /><HealthChart emptyLabel={t("noRecords")} data={months.map((date) => { const row = checkInMonths.find((item) => item.date === date); return { date, diet: row?.diet == null ? null : Number(row.diet), workout: row?.workout == null ? null : Number(row.workout) }; })} series={[{ key: "diet", label: t("dietAdherence") }, { key: "workout", label: t("workoutCompletion") }]} unit="%" max={100} /></Card>
    </div></section>
    <section id="analytics-walking" className="analytics-coaching-section"><h2>{t("walkingTitle")}</h2><p>{t("walkingSource")}</p><div className="analytics-coaching-grid">
      {(["steps", "km"] as const).map((unit) => <Card key={unit}><CardHead title={t("walkingUnit", { unit: w(unit) })} meta={t("walkingTotalsSource")} action={more("/coach/workout-plans")} /><HealthChart emptyLabel={t("noRecords")} data={walking[unit]} series={[{ key: "actual", label: t("recorded") }, { key: "target", label: t("target") }]} unit={w(unit)} /></Card>)}
      <Card><CardHead title={t("walkingOutcomes")} meta={t("walkingOutcomesSource")} action={more("/coach/workout-plans")} /><RingChart segments={Object.entries(walking.outcomes).map(([status, value]) => ({ label: w(status), value, tone: status === "met" ? "green" : "slate" }))} centerValue={String(walking.completedDays)} centerLabel={t("clientDays")} /></Card>
    </div></section>
    <section id="analytics-sessions" className="analytics-coaching-section"><h2>{t("sessionsTitle")}</h2><p>{t("sessionsHint")}</p><div className="analytics-coaching-grid">
      <Card><CardHead title={t("attendance")} meta={t("attendanceSource")} action={more("/coach/personal-training")} /><HealthChart emptyLabel={t("noRecords")} data={pair(attendedMonths, missedMonths)} series={[{ key: "first", label: statusLabel(ts, "attended") }, { key: "second", label: statusLabel(ts, "no_show") }]} /></Card>
      <Card><CardHead title={t("sessionStatus")} meta={t("sessionStatusSource")} action={more("/coach/personal-training")} /><RingChart segments={segments(sessionStatuses)} centerValue={String(total(sessionStatuses))} centerLabel={t("sessions")} /></Card>
      <Card><CardHead title={t("consultations")} meta={t("consultationsSource", { count: Number(converted?.total || 0) })} action={more("/coach/consultations")} /><HorizontalBars items={segments(consultationStatuses)} valueLabel={t("consultations")} emptyLabel={t("noRecords")} /></Card>
      <Card><CardHead title={t("checkInReviews")} meta={t("checkInReviewsSource")} action={more("/coach/check-ins")} /><HealthChart emptyLabel={t("noRecords")} data={pair(submittedMonths, reviewedMonths)} series={[{ key: "first", label: t("awaitingReview") }, { key: "second", label: t("reviewed") }]} /></Card>
    </div></section>
    <section id="analytics-transformations" className="analytics-coaching-section"><h2>{t("transformationsTitle")}</h2><p>{t("transformationsHint")}</p><div className="analytics-coaching-grid">
      <Card><CardHead title={t("publicationStatus")} meta={t("publicationSource")} action={more("/coach/transformations")} /><RingChart segments={transformationStatuses.map((row) => ({ label: t(String(row.key) === "1" ? "published" : "draft"), value: Number(row.total), tone: String(row.key) === "1" ? "green" : "slate" }))} centerValue={String(total(transformationStatuses))} centerLabel={t("stories")} /></Card>
      <Card><CardHead title={t("newStories")} meta={t("storiesSource")} action={more("/coach/transformations")} /><HealthChart emptyLabel={t("noRecords")} data={chart(transformationMonths)} series={[{ key: "value", label: t("stories") }]} /></Card>
    </div></section>
  </div>;
}
