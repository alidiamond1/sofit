import { Activity, CheckCircle2, Ruler, Scale, Utensils } from "lucide-react";
import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { requireRole } from "@/lib/auth/session";
import { database } from "@/lib/db";
import { adultBmiEligible, calculateBmi } from "@/lib/body-metrics";
import { getBilling } from "@/lib/payments/billing";
import { hasAnyProgressPhoto, parseProgressPhotos } from "@/lib/progress-photos";
import { shiftWalkingDate } from "@/lib/walking";
import { statusLabel } from "@/lib/status-labels";
import { Badge, Card, PageHeader, StatCard } from "@/components/dashboard/primitives";
import { ProgressPhotoTimeline } from "@/components/dashboard/progress-photos";
import { walkingData } from "@/components/plans/walking-pages";
import { BodyMetricsEditor } from "./body-metrics-form";
import { HealthChart } from "./health-chart";

function calendarDate(value: unknown) {
  return value instanceof Date
    ? `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`
    : String(value || "").slice(0, 10);
}

export async function BodyMetricsPage() {
  const session = await requireRole("client");
  const [t, p, h, w, locale, billing] = await Promise.all([
    getTranslations("BodyMetrics"), getTranslations("ClientProgress"), getTranslations("HealthProgress"),
    getTranslations("Walking"), getLocale(), getBilling(session.id),
  ]);
  const db = database();
  const client = await db("clients").join("users", "users.id", "clients.user_id")
    .select("clients.*", "users.date_of_birth as user_date_of_birth").where("clients.user_id", session.id).first();
  if (!client) return <Card><p>{t("missingClient")}</p></Card>;
  const checkIns = await db("check_ins").where({ client_id: client.id })
    .whereIn("status", ["submitted", "reviewed"]).orderBy("week_of", "desc");
  const latest = checkIns[0];
  const latestWeight = checkIns.find((entry) => entry.weight_kg != null);
  const weight = latestWeight?.weight_kg ?? client.starting_weight_kg;
  const dateOfBirth = calendarDate(client.date_of_birth || client.user_date_of_birth);
  const eligible = adultBmiEligible(dateOfBirth);
  const bmi = eligible ? calculateBmi(client.height_cm, weight) : null;
  const number = new Intl.NumberFormat(locale, { maximumFractionDigits: 1 });
  const statusText = await getTranslations("Common.status");
  const weekly = checkIns.slice().reverse().map((entry) => ({
    date: calendarDate(entry.week_of),
    status: String(entry.status),
    weight: entry.weight_kg == null ? null : Number(entry.weight_kg),
    bmi: eligible ? calculateBmi(client.height_cm, entry.weight_kg) : null,
    diet: entry.diet_adherence_pct == null ? null : Number(entry.diet_adherence_pct),
    workout: entry.workout_completion_pct == null ? null : Number(entry.workout_completion_pct),
    energy: entry.energy_score == null ? null : Number(entry.energy_score),
    sleep: entry.sleep_score == null ? null : Number(entry.sleep_score),
  }));
  const photos = checkIns.map((entry) => ({ key: String(entry.id), weekLabel: calendarDate(entry.week_of), photos: parseProgressPhotos(entry.progress_photos) })).filter((entry) => hasAnyProgressPhoto(entry.photos));
  // Preserve the billing gate for coaching activity; health details stay accessible.
  const walking = billing.unlocked ? await walkingData(Number(client.id), session.id) : null;
  const [completions, scheduledWorkouts, sessions] = walking ? await Promise.all([
    db("plan_completions").select("plan_type", "scheduled_on").count<Array<{ plan_type: string; scheduled_on: unknown; count: number | string }>>({ count: "*" }).where({ client_id: client.id }).whereBetween("scheduled_on", [shiftWalkingDate(walking.today, -29), walking.today]).groupBy("plan_type", "scheduled_on"),
    db("workout_completions").select("scheduled_on").count<Array<{ scheduled_on: unknown; count: number | string }>>({ count: "*" }).where({ client_id: client.id }).whereBetween("scheduled_on", [shiftWalkingDate(walking.today, -29), walking.today]).groupBy("scheduled_on"),
    db("sessions").select("starts_at", "attendance").where({ client_id: client.id }).whereIn("attendance", ["attended", "no_show"]).orderBy("starts_at"),
  ]) : [[], [], []];
  const activity = walking ? Array.from({ length: 30 }, (_, index) => {
    const date = shiftWalkingDate(walking.today, index - 29);
    const count = (type: string) => Number(completions.find((row) => calendarDate(row.scheduled_on) === date && row.plan_type === type)?.count || 0);
    return { date, meals: count("diet"), exercises: count("workout"), scheduled: Number(scheduledWorkouts.find((row) => calendarDate(row.scheduled_on) === date)?.count || 0) };
  }) : [];
  const sessionMonths = new Map<string, { date: string; attended: number; missed: number }>();
  for (const row of sessions) {
    const parts = new Intl.DateTimeFormat("en", { year: "numeric", month: "2-digit", timeZone: walking!.timezone }).formatToParts(new Date(row.starts_at));
    const date = `${parts.find((part) => part.type === "year")!.value}-${parts.find((part) => part.type === "month")!.value}-01`;
    const point = sessionMonths.get(date) || { date, attended: 0, missed: 0 };
    if (row.attendance === "attended") point.attended++;
    else point.missed++;
    sessionMonths.set(date, point);
  }
  const weeklyCharts = [
    { key: "diet", title: p("dietAdherence"), source: h("dietSource"), max: 100, unit: "%" },
    { key: "workout", title: p("workoutCompletion"), source: h("workoutSource"), max: 100, unit: "%" },
    { key: "energy", title: p("colEnergy"), source: h("energySource"), max: 10, unit: "/10" },
    { key: "sleep", title: p("colSleep"), source: h("sleepSource"), max: 10, unit: "/10" },
  ];
  return <div className="health-workspace">
    <PageHeader eyebrow={p("eyebrow")} title={h("title")} description={h("description")} actions={<BodyMetricsEditor height={String(client.height_cm ?? "")} startingWeight={String(client.starting_weight_kg ?? "")} dateOfBirth={dateOfBirth} goals={String(client.goals || "")} medicalNotes={String(client.medical_notes || "")} />} />
    <nav className="health-actions" aria-label={h("recordData")}>
      <Link href="/client/check-in" className="button secondary">{t("weeklyCheckIn")}</Link>
      <Link href="/client/walking" className="button secondary">{w("addWalk")}</Link>
      <Link href="/client/diet-plan" className="button secondary">{h("recordMeals")}</Link>
      <Link href="/client/workout-plan" className="button secondary">{h("recordWorkout")}</Link>
    </nav>
    <div className="stats-grid compact">
      <StatCard label={t("height")} value={client.height_cm ? `${number.format(Number(client.height_cm))} cm` : "—"} icon={<Ruler size={18} />} />
      <StatCard label={t("startingWeight")} value={client.starting_weight_kg ? `${number.format(Number(client.starting_weight_kg))} kg` : "—"} icon={<Scale size={18} />} />
      <StatCard label={t("currentWeight")} value={weight ? `${number.format(Number(weight))} kg` : "—"} note={latestWeight ? t("latestWeek", { date: calendarDate(latestWeight.week_of) }) : t("usingBaseline")} icon={<Scale size={18} />} />
      <StatCard label="BMI" value={bmi === null ? "—" : number.format(bmi)} note={eligible ? t("bmiUpdates") : t("ageHint")} icon={<Activity size={18} />} />
    </div>
    <section className="health-section" aria-labelledby="health-measurements"><h2 id="health-measurements">{h("measurements")}</h2><p>{h("measurementSource")}</p>
      <div className="progress-chart-grid">
        <Card><h3>{p("weightTrend")}</h3><p>{h("weightSource")}</p><HealthChart data={weekly} series={[{ key: "weight", label: p("weightLabel") }]} unit="kg" /></Card>
        <Card><h3>{h("bmiTrend")}</h3><p>{eligible ? h("bmiSource") : t("ageHint")}</p><HealthChart data={weekly} series={[{ key: "bmi", label: "BMI" }]} /></Card>
      </div>
      <details className="health-bmi-guide"><summary>{t("bmiTitle")}</summary><p>{t("bmiExplanation")}</p><p>{t("routineHint")}</p><a href="https://www.cdc.gov/bmi/about/index.html" target="_blank" rel="noreferrer">{t("source")}</a></details>
    </section>
    {billing.unlocked ? <>
      <section className="health-section" aria-labelledby="health-habits"><h2 id="health-habits">{h("habits")}</h2><p>{h("weeklySource")}</p>
        <div className="stats-grid compact">
          <StatCard label={p("dietAdherence")} value={latest?.diet_adherence_pct != null ? `${latest.diet_adherence_pct}%` : "—"} icon={<Utensils size={18} />} />
          <StatCard label={p("workoutCompletion")} value={latest?.workout_completion_pct != null ? `${latest.workout_completion_pct}%` : "—"} icon={<Activity size={18} />} />
          <StatCard label={p("checkIns")} value={String(checkIns.length)} icon={<CheckCircle2 size={18} />} />
        </div>
        <div className="progress-chart-grid">{weeklyCharts.map((chart) => <Card key={chart.key}><h3>{chart.title}</h3><p>{chart.source}</p><HealthChart data={weekly} series={[{ key: chart.key, label: chart.title }]} unit={chart.unit} max={chart.max} /></Card>)}</div>
      </section>
      <section className="health-section" aria-labelledby="health-activity"><h2 id="health-activity">{h("activity")}</h2><p>{h("activitySource")}</p><div className="progress-chart-grid">
        <Card><h3>{h("mealActivity")}</h3><p>{h("mealSource")}</p><HealthChart data={activity} series={[{ key: "meals", label: h("meals") }]} /></Card>
        <Card><h3>{h("exerciseActivity")}</h3><p>{h("exerciseSource")}</p><HealthChart data={activity} series={[{ key: "exercises", label: h("planExercises") }, { key: "scheduled", label: h("scheduledExercises") }]} /></Card>
        <Card><h3>{h("sessions")}</h3><p>{h("sessionSource")}</p><HealthChart data={[...sessionMonths.values()]} series={[{ key: "attended", label: h("attended") }, { key: "missed", label: h("missed") }]} /></Card>
      </div></section>
      {walking && <section className="health-section" aria-labelledby="health-walking"><div className="walking-heading"><h2 id="health-walking">{w("title")}</h2><Link className="button secondary" href="/client/walking">{w("addWalk")}</Link></div><p>{h("walkingSource")}</p>
        <div className="progress-chart-grid">{(["steps", "km"] as const).filter((unit) => walking.days.some((day) => day.target.unit === unit)).map((unit) => <Card key={unit}><h3>{h("walkingChart", { unit: w(unit) })}</h3><HealthChart data={walking.days.slice().reverse().map((day) => ({ date: day.date, actual: day.target.unit === unit ? day.log?.amount ?? null : null, target: day.target.unit === unit ? day.target.amount : null }))} series={[{ key: "actual", label: h("actual") }, { key: "target", label: w("dailyTarget") }]} unit={w(unit)} /></Card>)}</div>
        {walking.days.length ? <Card><div className="data-table-wrap"><table className="data-table"><thead><tr><th>{w("date")}</th><th>{h("actual")}</th><th>{w("dailyTarget")}</th><th>{w("status")}</th></tr></thead><tbody>{walking.days.map((day) => <tr key={day.date}><td>{day.date}</td><td>{day.log ? number.format(day.log.amount) : "—"} {w(day.target.unit)}</td><td>{number.format(day.target.amount)} {w(day.target.unit)}</td><td><Badge tone={day.status === "met" ? "success" : "neutral"}>{w(day.status)}{day.log ? ` · ${day.percent}%` : ""}</Badge></td></tr>)}</tbody></table></div></Card> : <p>{w("noHistory")}</p>}
      </section>}
      <section className="health-section" aria-labelledby="health-photos"><h2 id="health-photos">{p("photoTimelineTitle")}</h2><p>{p("photoTimelineMeta", { count: photos.length })}</p><Card>{photos.length ? <ProgressPhotoTimeline entries={photos} altPrefix={p("photoTimelineAltPrefix")} /> : <p>{p("photoTimelineEmptyHint")}</p>}</Card></section>
    </> : <Card><p>{h("unlockActivity")}</p><Link href="/client/payments" className="button secondary">{h("payments")}</Link></Card>}
    <Card><h2>{p("checkInHistory")}</h2><p>{p("recordsCount", { count: checkIns.length })}</p>{checkIns.length ? <div className="data-table-wrap"><table className="data-table"><thead><tr><th>{p("colWeek")}</th><th>{p("colWeight")}</th><th>BMI</th>{billing.unlocked && <><th>{p("colDiet")}</th><th>{p("colWorkout")}</th><th>{p("colEnergy")}</th><th>{p("colSleep")}</th></>}<th>{p("colStatus")}</th></tr></thead><tbody>{weekly.slice().reverse().map((entry) => <tr key={entry.date}><td>{entry.date}</td><td>{entry.weight == null ? "—" : `${number.format(entry.weight)} kg`}</td><td>{entry.bmi == null ? "—" : number.format(entry.bmi)}</td>{billing.unlocked && <><td>{entry.diet == null ? "—" : `${entry.diet}%`}</td><td>{entry.workout == null ? "—" : `${entry.workout}%`}</td><td>{entry.energy == null ? "—" : `${entry.energy}/10`}</td><td>{entry.sleep == null ? "—" : `${entry.sleep}/10`}</td></>}</tr>)}</tbody></table></div> : <p>{p("emptyHint")}</p>}</Card>
  </div>;
}
