import {
  Activity,
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  CircleDollarSign,
  ClipboardList,
  Dumbbell,
  Scale,
  UserRoundX,
  Utensils,
} from "lucide-react";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { database } from "@/lib/db";
import { hasAnyProgressPhoto, parseProgressPhotos } from "@/lib/progress-photos";
import { statusLabel } from "@/lib/status-labels";
import { todayISO } from "@/lib/schedule";
import { DietPlanCard, WorkoutPlanCard, type PlanCompletionRow } from "./real-client-section";
import { Avatar, Badge, Card, CardHead, StatCard } from "./primitives";
import { ProgressPhotoCompare, ProgressPhotoTimeline } from "./progress-photos";
import { TrendLineChart } from "./charts";

const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
const dateOnly = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" });

function numeric(value: unknown) {
  return Number(value || 0);
}

function statusTone(status: string): "success" | "warning" | "danger" | "neutral" {
  if (status === "active") return "success";
  if (status === "paused" || status === "onboarding") return "warning";
  if (status === "churned") return "danger";
  return "neutral";
}

function tone(status: string): "success" | "warning" | "danger" | "neutral" {
  if (["reviewed", "paid", "completed"].includes(status)) return "success";
  if (["overdue"].includes(status)) return "danger";
  if (["pending", "submitted", "unpaid", "draft"].includes(status)) return "warning";
  return "neutral";
}

async function loadClientDetail(clientId: number) {
  const db = database();
  const client = await db("clients")
    .select(
      "clients.id",
      "clients.user_id",
      "clients.status",
      "clients.pipeline_stage",
      "clients.joined_at",
      "clients.created_at",
      "clients.phone",
      "clients.date_of_birth",
      "clients.goals",
      "clients.medical_notes",
      "clients.starting_weight_kg",
      "users.name",
      "users.email",
      "users.avatar_path",
      "services.name as service_name",
      "services.tier as service_tier",
      "packages.name as package_name",
      "packages.category as package_category",
    )
    .join("users", "users.id", "clients.user_id")
    .leftJoin("services", "services.id", "clients.service_id")
    .leftJoin("packages", "packages.id", "clients.package_id")
    .where("clients.id", clientId)
    .first();

  if (!client) return null;

  const [checkIns, dietPlans, workoutPlans, invoices, settingsRow] = await Promise.all([
    db("check_ins").where({ client_id: clientId }).orderBy("week_of", "desc"),
    db("diet_plans").where({ client_id: clientId }).orderBy("updated_at", "desc"),
    db("workout_plans").where({ client_id: clientId }).orderBy("updated_at", "desc"),
    db("invoices").where({ client_id: clientId }).whereIn("status", ["unpaid", "overdue"]).orderBy("due_on"),
    db("user_settings").select("timezone").where({ user_id: client.user_id }).first(),
  ]);

  const currentDiet = dietPlans.find((plan) => plan.status === "active") || dietPlans[0] || null;
  const currentWorkout = workoutPlans.find((plan) => plan.status === "active") || workoutPlans[0] || null;
  const today = todayISO(String(settingsRow?.timezone || "Africa/Nairobi"));

  const [dietCompletions, workoutCompletions] = await Promise.all([
    currentDiet
      ? db("plan_completions").select("item_key", "scheduled_on", "details").where({ client_id: clientId, plan_type: "diet", plan_id: currentDiet.id })
      : Promise.resolve([] as PlanCompletionRow[]),
    currentWorkout
      ? db("plan_completions").select("item_key", "scheduled_on", "details").where({ client_id: clientId, plan_type: "workout", plan_id: currentWorkout.id })
      : Promise.resolve([] as PlanCompletionRow[]),
  ]);

  return { client, checkIns, currentDiet, currentWorkout, invoices, today, dietCompletions, workoutCompletions };
}

export async function ClientDetailView({ clientId }: { clientId: number }) {
  const t = await getTranslations("ClientDetail");
  const tClients = await getTranslations("Clients");
  const tc = await getTranslations("Common");
  const ts = await getTranslations("Common.status");

  const detail = await loadClientDetail(clientId);

  if (!detail) {
    return (
      <>
        <Link href="/coach/clients" className="button secondary review-back"><ArrowLeft size={15} /> {t("backToClients")}</Link>
        <Card className="empty-state"><UserRoundX size={24} /><h3>{t("notFoundTitle")}</h3><p>{t("notFoundHint")}</p></Card>
      </>
    );
  }

  const { client, checkIns, currentDiet, currentWorkout, invoices, today, dietCompletions, workoutCompletions } = detail;

  const latestCheckIn = checkIns[0] || null;
  const latestPhotos = latestCheckIn ? parseProgressPhotos(latestCheckIn.progress_photos) : null;
  const previousPhotoCheckIn = checkIns.slice(1).find((row) => hasAnyProgressPhoto(parseProgressPhotos(row.progress_photos))) || null;
  const previousPhotos = previousPhotoCheckIn ? parseProgressPhotos(previousPhotoCheckIn.progress_photos) : null;
  const photoTimelineWeeks = checkIns
    .slice(0, 8)
    .map((row) => ({ key: String(row.id), weekLabel: dateOnly.format(new Date(row.week_of)), photos: parseProgressPhotos(row.progress_photos) }))
    .filter((entry) => hasAnyProgressPhoto(entry.photos));
  const pendingCheckIns = checkIns.filter((row) => row.status === "submitted");
  const weightTrend = [...checkIns]
    .reverse()
    .filter((row) => row.weight_kg != null)
    .map((row) => ({ label: dateOnly.format(new Date(row.week_of)), value: numeric(row.weight_kg) }));
  const dietValues = checkIns.filter((row) => row.diet_adherence_pct != null).map((row) => numeric(row.diet_adherence_pct));
  const workoutValues = checkIns.filter((row) => row.workout_completion_pct != null).map((row) => numeric(row.workout_completion_pct));
  const avgDiet = dietValues.length ? Math.round(dietValues.reduce((sum, value) => sum + value, 0) / dietValues.length) : null;
  const avgWorkout = workoutValues.length ? Math.round(workoutValues.reduce((sum, value) => sum + value, 0) / workoutValues.length) : null;
  const joinedDate = client.joined_at || client.created_at;
  const daysAsClient = joinedDate ? Math.max(0, Math.floor((new Date().getTime() - new Date(joinedDate).getTime()) / 86_400_000)) : 0;
  const latestWeight = latestCheckIn?.weight_kg ?? client.starting_weight_kg ?? null;
  const hasAttention = pendingCheckIns.length > 0 || invoices.length > 0;
  const tierBadge = client.package_category || client.service_tier;

  return (
    <>
      <Link href="/coach/clients" className="button secondary review-back"><ArrowLeft size={15} /> {t("backToClients")}</Link>

      <Card className="client-detail-header">
        <Avatar name={client.name} src={client.avatar_path} tone={client.id % 5} className="xlarge" />
        <div className="client-detail-identity">
          <div className="client-detail-badges">
            <Badge tone={statusTone(client.status)}>{statusLabel(ts, client.status)}</Badge>
            <Badge tone="blue">{statusLabel(ts, client.pipeline_stage)}</Badge>
          </div>
          <h1>{client.name}</h1>
          <div className="client-detail-contact">
            <span>{client.email}</span>
            {client.phone ? <span>{client.phone}</span> : null}
            {client.date_of_birth ? <span>{t("bornOn", { date: dateOnly.format(new Date(client.date_of_birth)) })}</span> : null}
          </div>
        </div>
        <div className="client-detail-program">
          <span className="eyebrow">{t("currentProgram")}</span>
          <strong>{client.package_name || tClients("noPackageAssigned")}</strong>
          <span>{client.service_name || tClients("serviceNotAssigned")}</span>
          {tierBadge ? <Badge tone="success">{tc(`tiers.${tierBadge}`)}</Badge> : null}
          <span className="client-detail-since">{joinedDate ? t("clientSince", { date: dateOnly.format(new Date(joinedDate)) }) : null}</span>
        </div>
      </Card>

      {client.goals || client.medical_notes ? (
        <div className={client.goals && client.medical_notes ? "split-grid" : undefined}>
          {client.goals ? <Card><CardHead title={t("goalsTitle")} /><p>{client.goals}</p></Card> : null}
          {client.medical_notes ? <Card><CardHead title={t("medicalNotesTitle")} /><p>{client.medical_notes}</p></Card> : null}
        </div>
      ) : null}

      <div className="stats-grid">
        <StatCard
          label={t("statLatestWeight")}
          value={latestWeight != null ? `${latestWeight} kg` : "—"}
          note={latestCheckIn ? dateOnly.format(new Date(latestCheckIn.week_of)) : t("noCheckInsYet")}
          icon={<Scale size={18} />}
          points={weightTrend.map((point) => point.value)}
        />
        <StatCard
          label={t("statDietAdherence")}
          value={latestCheckIn?.diet_adherence_pct != null ? `${latestCheckIn.diet_adherence_pct}%` : "—"}
          note={avgDiet != null ? t("averagePctNote", { value: avgDiet }) : t("noCheckInsYet")}
          icon={<Utensils size={18} />}
          accent="green"
        />
        <StatCard
          label={t("statWorkoutCompletion")}
          value={latestCheckIn?.workout_completion_pct != null ? `${latestCheckIn.workout_completion_pct}%` : "—"}
          note={avgWorkout != null ? t("averagePctNote", { value: avgWorkout }) : t("noCheckInsYet")}
          icon={<Activity size={18} />}
        />
        <StatCard
          label={t("statClientFor")}
          value={t("daysCount", { count: daysAsClient })}
          note={joinedDate ? t("clientSince", { date: dateOnly.format(new Date(joinedDate)) }) : ""}
          icon={<CalendarDays size={18} />}
          accent="blue"
        />
      </div>

      <Card className="chart-card">
        <CardHead title={t("weightTrendTitle")} meta={t("weightTrendMeta")} />
        <TrendLineChart
          data={weightTrend}
          valueLabel={t("weightLabel")}
          formatValue={(value) => `${value} kg`}
          highestLabel={tc("chartHighest")}
          latestLabel={tc("chartLatest")}
          emptyLabel={tc("chartNoTrend")}
        />
      </Card>

      <div className="section-row">
        <div><span className="eyebrow">{t("progressPhotosEyebrow")}</span><h2>{t("progressPhotosTitle")}</h2></div>
      </div>
      {latestCheckIn && (hasAnyProgressPhoto(latestPhotos) || previousPhotos) ? (
        <Card>
          <ProgressPhotoCompare
            current={latestPhotos || { front: null, side: null, back: null }}
            currentLabel={dateOnly.format(new Date(latestCheckIn.week_of))}
            previous={previousPhotos}
            previousLabel={previousPhotoCheckIn ? dateOnly.format(new Date(previousPhotoCheckIn.week_of)) : undefined}
            altPrefix={client.name}
          />
          {photoTimelineWeeks.length > 1 ? (
            <>
              <div className="progress-photo-subhead">{t("progressPhotosRecentWeeks")}</div>
              <ProgressPhotoTimeline entries={photoTimelineWeeks} altPrefix={client.name} />
            </>
          ) : null}
        </Card>
      ) : (
        <Card className="empty-state"><ClipboardList size={24} /><h3>{t("noProgressPhotosTitle")}</h3><p>{t("noProgressPhotosHint")}</p></Card>
      )}

      <div className="section-row">
        <div><span className="eyebrow">{t("dietPlanEyebrow")}</span><h2>{t("dietPlanTitle")}</h2></div>
      </div>
      {currentDiet ? (
        <div className="client-plan-stack">
          <DietPlanCard plan={currentDiet} today={today} completions={dietCompletions} readOnly />
        </div>
      ) : (
        <Card className="empty-state">
          <Utensils size={24} />
          <h3>{t("noDietPlanTitle")}</h3>
          <p>{t("noDietPlanHint")}</p>
          <Link className="button primary small" href="/coach/diet-plans">{t("buildDietPlanCta")}</Link>
        </Card>
      )}

      <div className="section-row">
        <div><span className="eyebrow">{t("workoutPlanEyebrow")}</span><h2>{t("workoutPlanTitle")}</h2></div>
      </div>
      {currentWorkout ? (
        <div className="client-plan-stack">
          <WorkoutPlanCard plan={currentWorkout} today={today} completions={workoutCompletions} readOnly />
        </div>
      ) : (
        <Card className="empty-state">
          <Dumbbell size={24} />
          <h3>{t("noWorkoutPlanTitle")}</h3>
          <p>{t("noWorkoutPlanHint")}</p>
          <Link className="button primary small" href="/coach/workout-plans">{t("buildWorkoutPlanCta")}</Link>
        </Card>
      )}

      <div className="section-row">
        <div><span className="eyebrow">{t("attentionEyebrow")}</span><h2>{t("attentionTitle")}</h2></div>
      </div>
      {hasAttention ? (
        <Card>
          <div className="simple-rows">
            {pendingCheckIns.map((row) => (
              <div key={`checkin-${row.id}`}>
                <span className="task-icon sand"><CheckCircle2 size={16} /></span>
                <div><strong>{t("submittedOn", { date: dateOnly.format(new Date(row.week_of)) })}</strong><span>{t("awaitingCoachReview")}</span></div>
                <Link className="button secondary small" href="/coach/check-ins">{t("reviewCheckIns")}</Link>
              </div>
            ))}
            {invoices.map((invoice) => (
              <div key={`invoice-${invoice.id}`}>
                <span className="task-icon rose"><CircleDollarSign size={16} /></span>
                <div><strong>{invoice.number}</strong><span>{t("invoiceDueOn", { date: dateOnly.format(new Date(invoice.due_on)) })} · {money.format(numeric(invoice.amount))}</span></div>
                <Badge tone={tone(invoice.status)}>{statusLabel(ts, invoice.status)}</Badge>
                <Link className="button secondary small" href="/coach/payments">{t("viewPayments")}</Link>
              </div>
            ))}
          </div>
        </Card>
      ) : (
        <Card className="empty-state"><CheckCircle2 size={24} /><h3>{t("allCaughtUpTitle")}</h3><p>{t("allCaughtUpHint")}</p></Card>
      )}

      <div className="section-row">
        <div><span className="eyebrow">{t("historyEyebrow")}</span><h2>{t("historyTitle")}</h2></div>
        {checkIns.length ? <Badge>{t("historyMeta", { count: checkIns.length })}</Badge> : null}
      </div>
      {checkIns.length === 0 ? (
        <Card className="empty-state"><ClipboardList size={24} /><h3>{t("noHistoryTitle")}</h3><p>{t("noHistoryHint")}</p></Card>
      ) : (
        <Card>
          <div className="data-table-wrap">
            <table className="data-table">
              <thead><tr><th>{t("colWeek")}</th><th>{t("colWeight")}</th><th>{t("colDiet")}</th><th>{t("colWorkout")}</th><th>{t("colStatus")}</th></tr></thead>
              <tbody>
                {checkIns.slice(0, 8).map((row) => (
                  <tr key={row.id}>
                    <td>{dateOnly.format(new Date(row.week_of))}</td>
                    <td>{row.weight_kg != null ? `${row.weight_kg} kg` : "-"}</td>
                    <td>{row.diet_adherence_pct != null ? `${row.diet_adherence_pct}%` : "-"}</td>
                    <td>{row.workout_completion_pct != null ? `${row.workout_completion_pct}%` : "-"}</td>
                    <td><Badge tone={tone(row.status)}>{statusLabel(ts, row.status)}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </>
  );
}
