import {
  BarChart3,
  CalendarDays,
  CheckCircle2,
  CircleDollarSign,
  ClipboardList,
  Dumbbell,
  Mail,
  TrendingUp,
  UserPlus,
  Users,
} from "lucide-react";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { requireRole } from "@/lib/auth/session";
import { database } from "@/lib/db";
import { parseProgressPhotos } from "@/lib/progress-photos";
import { statusLabel } from "@/lib/status-labels";
import { BookConsultationButton, CoachConsultationsWorkspace, type ConsultationRow, type ConsultationClientOption } from "@/components/dashboard/coach-consultations";
import { BookSessionButton, CoachPersonalTrainingWorkspace, type SessionRow, type SessionClientOption, type SessionServiceOption } from "@/components/dashboard/coach-personal-training";
import { CoachCheckInsWorkspace, type CheckInRow } from "@/components/dashboard/coach-check-ins";
import { CoachDietPlansPage, CoachWorkoutPlansPage } from "@/components/plans/coach-plan-pages";
import { CoachPackagesPage } from "@/components/packages/coach-packages";
import { CoachTransformations } from "@/components/transformations/coach-transformations";
import { AccountProfilePage, AccountSettingsPage } from "@/components/profile/account-pages";
import { ClientDetailView } from "./client-detail";
import { ClientDirectory, type ClientDirectoryRow } from "./client-directory";
import { CoachAnalyticsDashboard, type CoachAnalyticsData } from "./coach-analytics-dashboard";
import { RingChart, TrendLineChart } from "./charts";
import { Avatar, Badge, Card, CardHead, PageHeader, StatCard } from "./primitives";
import { MessagingWorkspace } from "@/components/messages/messaging-workspace";
import { loadCoachMessageThreads } from "@/lib/messages";
import { WeekScheduler, type SchedulerDiet, type SchedulerPlan, type SchedulerSlot } from "@/components/schedule/week-scheduler";
import { planDays } from "@/lib/schedule";

export const realCoachSections = [
  "clients",
  "invites",
  "consultations",
  "packages",
  "transformations",
  "diet-plans",
  "workout-plans",
  "schedule",
  "personal-training",
  "check-ins",
  "payments",
  "messages",
  "analytics",
  "profile",
  "settings",
];

const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
const dateTime = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
const dateOnly = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" });

function numeric(value: unknown) {
  return Number(value || 0);
}

function dateInputValue(value: unknown) {
  if (!value) return "";
  if (typeof value === "string") return value.slice(0, 10);
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? "" : `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function tone(status: string): "success" | "warning" | "danger" | "neutral" {
  if (["active", "approved", "paid", "attended", "reviewed", "completed"].includes(status)) return "success";
  if (["overdue", "rejected", "cancelled", "no_show", "churned"].includes(status)) return "danger";
  if (["pending", "submitted", "paused", "unpaid", "draft", "scheduled"].includes(status)) return "warning";
  return "neutral";
}

async function EmptyState({ text }: { text: string }) {
  const t = await getTranslations("Common");
  return <Card className="empty-state"><ClipboardList size={24} /><h3>{t("noRecordsYet")}</h3><p>{text}</p></Card>;
}

async function CoachOverview() {
  const t = await getTranslations("Overview");
  const tc = await getTranslations("Common");
  const ts = await getTranslations("Common.status");
  const db = database();
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);
  const startToday = new Date();
  startToday.setHours(0, 0, 0, 0);
  const endToday = new Date(startToday);
  endToday.setDate(endToday.getDate() + 1);
  const sixMonthsAgo = new Date(startOfMonth);
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);

  const [
    activeClients,
    monthlyRevenue,
    draftDietPlans,
    draftWorkoutPlans,
    submittedCheckIns,
    overdueInvoices,
    pendingApplications,
    recentApplications,
    consultations,
    sessions,
    recentClients,
    revenueTrendRows,
    clientStatusRows,
  ] = await Promise.all([
    db("clients").where({ status: "active" }).count({ total: "*" }).first(),
    db("invoices").where({ status: "paid" }).where("paid_at", ">=", startOfMonth).sum({ total: "amount" }).first(),
    db("diet_plans").where({ status: "draft" }).count({ total: "*" }).first(),
    db("workout_plans").where({ status: "draft" }).count({ total: "*" }).first(),
    db("check_ins").where({ status: "submitted" }).count({ total: "*" }).first(),
    db("invoices").where({ status: "overdue" }).count({ total: "*" }).first(),
    db("invites").where({ status: "submitted" }).count({ total: "*" }).first(),
    db("invites").select("id", "email", "submitted_at", "intake_answers", "user_id").where({ status: "submitted" }).orderBy("submitted_at", "desc").limit(5),
    db("consultations")
      .select("consultations.starts_at", "consultations.status", "users.name")
      .join("clients", "clients.id", "consultations.client_id")
      .join("users", "users.id", "clients.user_id")
      .where("consultations.starts_at", ">=", startToday)
      .where("consultations.starts_at", "<", endToday),
    db("sessions")
      .select("sessions.starts_at", "sessions.attendance as status", "users.name", "services.name as service")
      .join("clients", "clients.id", "sessions.client_id")
      .join("users", "users.id", "clients.user_id")
      .leftJoin("services", "services.id", "sessions.service_id")
      .where("sessions.starts_at", ">=", startToday)
      .where("sessions.starts_at", "<", endToday),
    db("clients")
      .select("clients.id", "clients.status", "clients.pipeline_stage", "users.name", "users.email", "services.name as service")
      .join("users", "users.id", "clients.user_id")
      .leftJoin("services", "services.id", "clients.service_id")
      .orderBy("clients.created_at", "desc")
      .limit(5),
    db("invoices")
      .select(db.raw("DATE_FORMAT(paid_at, '%Y-%m') as month"))
      .sum({ total: "amount" })
      .where({ status: "paid" })
      .where("paid_at", ">=", sixMonthsAgo)
      .groupByRaw("DATE_FORMAT(paid_at, '%Y-%m')")
      .orderBy("month"),
    db("clients").select("status").count({ total: "*" }).groupBy("status"),
  ]);

  const schedule = [
    ...consultations.map((item) => ({ ...item, service: "Consultation" })),
    ...sessions,
  ].sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime());
  const revenueByMonth = new Map(
    (revenueTrendRows as Array<{ month: string; total: number | string }>).map((row) => [row.month, numeric(row.total)]),
  );
  const revenueTrend = Array.from({ length: 6 }, (_, index) => {
    const date = new Date(sixMonthsAgo.getFullYear(), sixMonthsAgo.getMonth() + index, 1);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    return { label: date.toLocaleDateString("en-US", { month: "short" }), value: revenueByMonth.get(key) || 0 };
  });
  const clientStatuses = (clientStatusRows as Array<{ status: string; total: number | string }>).map((row, index) => ({
    label: statusLabel(ts, row.status),
    value: numeric(row.total),
    tone: (["green", "amber", "slate", "blue"][index % 4]) as "green" | "amber" | "slate" | "blue",
  }));

  return (
    <>
      <PageHeader
        eyebrow={dateOnly.format(new Date())}
        title={t("title")}
        description={t("description")}
        actions={<><Link className="button secondary" href="/coach/diet-plans">{t("buildPlan")}</Link><Link className="button primary" href="/coach/invites"><Mail size={15} /> {t("inviteClient")}</Link></>}
      />
      <div className="stats-grid">
        <StatCard label={t("statActiveClients")} value={String(numeric(activeClients?.total))} note={t("statActiveClientsNote")} icon={<Users size={18} />} accent="blue" />
        <StatCard label={t("statMonthlyRevenue")} value={money.format(numeric(monthlyRevenue?.total))} note={t("statMonthlyRevenueNote")} icon={<TrendingUp size={18} />} accent="green" points={revenueTrend.map((point) => point.value)} />
        <StatCard label={t("statPlansToDeliver")} value={String(numeric(draftDietPlans?.total) + numeric(draftWorkoutPlans?.total))} note={t("statPlansToDeliverNote")} icon={<Dumbbell size={18} />} accent="blue" />
        <StatCard label={t("statOpenReviews")} value={String(numeric(pendingApplications?.total) + numeric(submittedCheckIns?.total) + numeric(overdueInvoices?.total))} note={t("statOpenReviewsNote")} icon={<ClipboardList size={18} />} accent="amber" />
      </div>
      <div className="dashboard-insight-grid">
        <Card className="chart-card">
          <CardHead title={t("revenuePulse")} meta={t("revenuePulseMeta")} action={<Link className="text-button" href="/coach/analytics">{t("fullAnalytics")}</Link>} />
          <TrendLineChart data={revenueTrend} valueLabel="Revenue" formatValue={(value) => money.format(value)} highestLabel={tc("chartHighest")} latestLabel={tc("chartLatest")} emptyLabel={tc("chartNoTrend")} />
        </Card>
        <Card className="chart-card status-card">
          <CardHead title={t("clientHealth")} meta={t("clientHealthMeta")} action={<BarChart3 size={18} />} />
          <RingChart segments={clientStatuses} centerValue={String(numeric(activeClients?.total))} centerLabel={t("activeRingLabel")} />
        </Card>
      </div>
      <div className="overview-grid">
        <Card>
          <CardHead title={t("todaysSchedule")} meta={t("scheduledItemsMeta", { count: schedule.length })} />
          <div className="simple-rows">
            {schedule.map((item, index) => (
              <div key={`${item.starts_at}-${index}`}>
                <span className="task-icon mint"><CalendarDays size={16} /></span>
                <div><strong>{item.name}</strong><span>{item.service || t("personalTrainingFallback")} - {dateTime.format(new Date(item.starts_at))}</span></div>
                <Badge tone={tone(item.status)}>{statusLabel(ts, item.status)}</Badge>
              </div>
            ))}
            {schedule.length === 0 ? <div><span>{t("noSessionsToday")}</span></div> : null}
          </div>
        </Card>
        <Card>
          <CardHead title={t("needsAttention")} meta={t("liveTaskCounts")} />
          <div className="task-summary">
            <div><span className="task-icon mint"><ClipboardList size={18} /></span><p><strong>{t("plansCount", { count: numeric(draftDietPlans?.total) + numeric(draftWorkoutPlans?.total) })}</strong><small>{t("draftsToComplete")}</small></p></div>
            <div><span className="task-icon mint"><Mail size={18} /></span><p><strong>{t("applicationsCount", { count: numeric(pendingApplications?.total) })}</strong><small>{t("waitingForDecision")}</small></p></div>
            <div><span className="task-icon sand"><CheckCircle2 size={18} /></span><p><strong>{t("checkInsCount", { count: numeric(submittedCheckIns?.total) })}</strong><small>{t("waitingForReview")}</small></p></div>
            <div><span className="task-icon rose"><CircleDollarSign size={18} /></span><p><strong>{t("invoicesCount", { count: numeric(overdueInvoices?.total) })}</strong><small>{t("markedOverdue")}</small></p></div>
          </div>
        </Card>
      </div>
      <Card>
        <CardHead title={t("newApplications")} meta={t("awaitingReviewMeta", { count: numeric(pendingApplications?.total) })} action={<Link className="text-button" href="/coach/invites">{t("viewAllApplications")}</Link>} />
        <div className="simple-rows">
          {recentApplications.map((application) => {
            const answers = typeof application.intake_answers === "string" ? JSON.parse(application.intake_answers) : application.intake_answers || {};
            const name = answers.full_name || application.email;
            return <div key={application.id}><Avatar name={name} /><div><strong>{name}</strong><span>{application.email} - {application.user_id ? t("accountCreated") : t("awaitingSignup")}</span></div><Badge tone="warning">{t("reviewBadge")}</Badge><Link className="button secondary small" href={`/coach/invites/${application.id}`}>{t("open")}</Link></div>;
          })}
          {recentApplications.length === 0 ? <div><span>{t("noApplicationsWaiting")}</span></div> : null}
        </div>
      </Card>
      <Card>
        <CardHead title={t("newestClients")} meta={t("mostRecentlyAdded")} />
        <div className="simple-rows">
          {recentClients.map((client, index) => <div key={client.id}><Avatar name={client.name} tone={index} /><div><strong>{client.name}</strong><span>{client.email} - {client.service || t("noServiceAssigned")}</span></div><Badge tone={tone(client.status)}>{statusLabel(ts, client.status)}</Badge><Badge>{statusLabel(ts, client.pipeline_stage)}</Badge></div>)}
          {recentClients.length === 0 ? <div><span>{t("noClientsYet")}</span></div> : null}
        </div>
      </Card>
    </>
  );
}

async function CoachClients({ selectedClientId }: { selectedClientId?: number | null }) {
  if (selectedClientId) return <ClientDetailView clientId={selectedClientId} />;
  const t = await getTranslations("Clients");
  const tc = await getTranslations("Common");
  const db = database();
  const [clients, serviceOptions, packageOptions] = await Promise.all([
    db("clients")
      .select(
        "clients.id",
        "clients.service_id",
        "clients.package_id",
        "clients.status",
        "clients.pipeline_stage",
        "clients.joined_at",
        "clients.phone",
        "clients.date_of_birth",
        "clients.goals",
        "clients.medical_notes",
        "users.name",
        "users.email",
        "users.avatar_path",
        "services.name as service",
        "packages.name as package_name",
        "packages.category as package_category",
        db.raw("(SELECT COALESCE(ROUND(AVG((COALESCE(ci.diet_adherence_pct, 0) + COALESCE(ci.workout_completion_pct, 0)) / 2)), 0) FROM check_ins AS ci WHERE ci.client_id = clients.id) as adherence"),
      )
      .join("users", "users.id", "clients.user_id")
      .leftJoin("services", "services.id", "clients.service_id")
      .leftJoin("packages", "packages.id", "clients.package_id")
      .orderBy("clients.created_at", "desc"),
    db("services").select("id", "name", "is_active").orderBy("name"),
    db("packages").select("id", "name", "category", "is_active").orderBy("name"),
  ]);

  const directoryRows: ClientDirectoryRow[] = clients.map((client) => ({
    id: numeric(client.id),
    name: String(client.name),
    email: String(client.email),
    avatarPath: client.avatar_path ? String(client.avatar_path) : null,
    phone: String(client.phone || ""),
    dateOfBirth: dateInputValue(client.date_of_birth),
    goals: String(client.goals || ""),
    medicalNotes: String(client.medical_notes || ""),
    status: String(client.status),
    pipelineStage: String(client.pipeline_stage),
    joined: client.joined_at ? dateOnly.format(new Date(client.joined_at)) : tc("notRecorded"),
    serviceId: client.service_id ? numeric(client.service_id) : null,
    packageId: client.package_id ? numeric(client.package_id) : null,
    service: client.service ? String(client.service) : null,
    packageName: client.package_name ? String(client.package_name) : null,
    packageCategory: client.package_category ? String(client.package_category) : null,
    adherence: numeric(client.adherence),
  }));

  return (
    <>
      <PageHeader
        eyebrow={t("eyebrow")}
        title={t("title")}
        description={t("description")}
        actions={<Link className="button primary" href="/coach/invites"><UserPlus size={16} /> {t("inviteAClient")}</Link>}
      />
      {directoryRows.length === 0 ? <EmptyState text={t("emptyInviteHint")} /> : (
        <ClientDirectory
          clients={directoryRows}
          services={serviceOptions.map((service) => ({ id: numeric(service.id), name: String(service.name), isActive: Boolean(service.is_active) }))}
          packages={packageOptions.map((item) => ({ id: numeric(item.id), name: String(item.name), category: String(item.category), isActive: Boolean(item.is_active) }))}
        />
      )}
    </>
  );
}

async function CoachConsultations() {
  const t = await getTranslations("Consultations");
  const db = database();
  const [consultationRows, clientRows] = await Promise.all([
    db("consultations")
      .select("consultations.id", "consultations.starts_at", "consultations.duration_minutes", "consultations.status", "consultations.session_notes", "users.name as client")
      .join("clients", "clients.id", "consultations.client_id")
      .join("users", "users.id", "clients.user_id")
      .orderBy("consultations.starts_at", "desc"),
    db("clients")
      .select("clients.id", "clients.status", "users.name")
      .join("users", "users.id", "clients.user_id")
      .orderBy("users.name"),
  ]);

  const consultations: ConsultationRow[] = consultationRows.map((row) => ({
    id: numeric(row.id),
    client: String(row.client),
    startsAt: new Date(row.starts_at).toISOString(),
    durationMinutes: numeric(row.duration_minutes),
    status: row.status as ConsultationRow["status"],
    notes: String(row.session_notes || ""),
  }));
  const clients: ConsultationClientOption[] = clientRows.map((row) => ({ id: numeric(row.id), name: String(row.name), status: String(row.status) }));

  return (
    <>
      <PageHeader
        eyebrow={t("eyebrow")}
        title={t("title")}
        description={t("description")}
        actions={<BookConsultationButton clients={clients} />}
      />
      <CoachConsultationsWorkspace consultations={consultations} />
    </>
  );
}

async function CoachPersonalTraining() {
  const t = await getTranslations("PersonalTraining");
  const db = database();
  const [sessionRows, clientRows, serviceRows] = await Promise.all([
    db("sessions")
      .select("sessions.id", "sessions.starts_at", "sessions.duration_minutes", "sessions.attendance", "sessions.notes", "users.name as client", "services.name as service", "services.tier")
      .join("clients", "clients.id", "sessions.client_id")
      .join("users", "users.id", "clients.user_id")
      .leftJoin("services", "services.id", "sessions.service_id")
      .orderBy("sessions.starts_at", "desc"),
    db("clients")
      .select("clients.id", "clients.status", "users.name")
      .join("users", "users.id", "clients.user_id")
      .orderBy("users.name"),
    db("services").select("id", "name", "tier").where({ type: "personal_training", is_active: true }).orderBy("tier"),
  ]);

  const sessions: SessionRow[] = sessionRows.map((row) => ({
    id: numeric(row.id),
    client: String(row.client),
    service: String(row.service || row.tier || "PT"),
    startsAt: new Date(row.starts_at).toISOString(),
    durationMinutes: numeric(row.duration_minutes),
    attendance: row.attendance as SessionRow["attendance"],
    notes: String(row.notes || ""),
  }));
  const clients: SessionClientOption[] = clientRows.map((row) => ({ id: numeric(row.id), name: String(row.name), status: String(row.status) }));
  const services: SessionServiceOption[] = serviceRows.map((row) => ({ id: numeric(row.id), name: String(row.name), tier: row.tier ? String(row.tier) : null }));

  return (
    <>
      <PageHeader
        eyebrow={t("eyebrow")}
        title={t("title")}
        description={t("description")}
        actions={<BookSessionButton clients={clients} services={services} />}
      />
      <CoachPersonalTrainingWorkspace sessions={sessions} />
    </>
  );
}

function normalizeDate(value: unknown): string {
  if (value instanceof Date) {
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, "0");
    const day = String(value.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }
  return String(value).slice(0, 10);
}

async function CoachCheckIns() {
  const t = await getTranslations("CheckIns");
  const db = database();
  const rows = await db("check_ins")
    .select("check_ins.*", "clients.id as client_id", "users.name as client")
    .join("clients", "clients.id", "check_ins.client_id")
    .join("users", "users.id", "clients.user_id")
    .orderBy("week_of", "desc");

  const checkIns: CheckInRow[] = rows.map((row) => ({
    id: numeric(row.id),
    clientId: numeric(row.client_id),
    client: String(row.client),
    weekOf: normalizeDate(row.week_of),
    weightKg: row.weight_kg != null ? Number(row.weight_kg) : null,
    dietPct: numeric(row.diet_adherence_pct),
    workoutPct: numeric(row.workout_completion_pct),
    energy: row.energy_score != null ? numeric(row.energy_score) : null,
    sleep: row.sleep_score != null ? numeric(row.sleep_score) : null,
    clientNotes: String(row.client_notes || ""),
    coachFeedback: String(row.coach_feedback || ""),
    status: row.status as CheckInRow["status"],
    progressPhotos: parseProgressPhotos(row.progress_photos),
  }));

  return (
    <>
      <PageHeader eyebrow={t("eyebrow")} title={t("title")} description={t("description")} />
      <CoachCheckInsWorkspace checkIns={checkIns} />
    </>
  );
}

async function CoachListSection({ section }: { section: string }) {
  const tPayments = await getTranslations("Payments");
  const tPackages = await getTranslations("Packages");
  const tMessages = await getTranslations("MessagesPanel");
  const ts = await getTranslations("Common.status");
  const db = database();
  let title = "";
  let description = "";
  let rows: Array<Record<string, unknown>> = [];
  let columns: Array<{ key: string; label: string; format?: (value: unknown, row: Record<string, unknown>) => React.ReactNode }> = [];
  let emptyText = "";

  if (section === "diet-plans" || section === "workout-plans") {
    const diet = section === "diet-plans";
    title = diet ? tPackages("dietPlans.title") : tPackages("workoutPlans.title");
    description = diet ? tPackages("dietPlans.description") : tPackages("workoutPlans.description");
    const table = diet ? "diet_plans" : "workout_plans";
    rows = await db(table).select(`${table}.*`, "users.name as client").join("clients", "clients.id", `${table}.client_id`).join("users", "users.id", "clients.user_id").orderBy(`${table}.updated_at`, "desc");
    columns = [{ key: "title", label: diet ? tPackages("dietPlans.colPlan") : tPackages("workoutPlans.colProgram") }, { key: "client", label: tPackages("dietPlans.colClient") }, { key: "version", label: tPackages("dietPlans.colVersion") }, { key: diet ? "daily_calories" : "weeks", label: diet ? tPackages("dietPlans.colCalories") : tPackages("workoutPlans.colWeeks") }, { key: "status", label: tPackages("dietPlans.colStatus"), format: (v) => <Badge tone={tone(String(v))}>{statusLabel(ts, String(v))}</Badge> }, { key: "starts_on", label: tPackages("dietPlans.colStarts"), format: (v) => v ? dateOnly.format(new Date(String(v))) : "-" }];
    emptyText = diet ? tPackages("dietPlans.noPlansHint") : tPackages("workoutPlans.noPlansHint");
  } else if (section === "payments") {
    title = tPayments("title"); description = tPayments("description");
    rows = await db("invoices").select("invoices.*", "users.name as client", "services.name as service").join("clients", "clients.id", "invoices.client_id").join("users", "users.id", "clients.user_id").leftJoin("services", "services.id", "invoices.service_id").orderBy("due_on", "desc");
    columns = [{ key: "number", label: tPayments("colInvoice") }, { key: "client", label: tPayments("colClient") }, { key: "service", label: tPayments("colService"), format: (v) => String(v || "-") }, { key: "amount", label: tPayments("colAmount"), format: (v) => money.format(numeric(v)) }, { key: "due_on", label: tPayments("colDue"), format: (v) => dateOnly.format(new Date(String(v))) }, { key: "status", label: tPayments("colStatus"), format: (v) => <Badge tone={tone(String(v))}>{statusLabel(ts, String(v))}</Badge> }];
    emptyText = tPayments("noRecordsYet");
  } else if (section === "messages") {
    title = tMessages("title"); description = tMessages("description");
    rows = await db("messages").select("messages.*", "sender.name as sender", "recipient.name as recipient").join("users as sender", "sender.id", "messages.sender_id").join("users as recipient", "recipient.id", "messages.recipient_id").orderBy("messages.created_at", "desc").limit(100);
    columns = [{ key: "sender", label: tMessages("colFrom") }, { key: "recipient", label: tMessages("colTo") }, { key: "body", label: tMessages("colMessage") }, { key: "created_at", label: tMessages("colSent"), format: (v) => dateTime.format(new Date(String(v))) }];
  }

  return <><PageHeader title={title} description={description} />{rows.length === 0 ? <EmptyState text={emptyText} /> : <Card><div className="data-table-wrap"><table className="data-table"><thead><tr>{columns.map((column) => <th key={column.key}>{column.label}</th>)}</tr></thead><tbody>{rows.map((row, index) => <tr key={String(row.id || index)}>{columns.map((column) => <td key={column.key}>{column.format ? column.format(row[column.key], row) : String(row[column.key] ?? "-")}</td>)}</tr>)}</tbody></table></div></Card>}</>;
}

async function CoachAnalytics() {
  const ts = await getTranslations("Common.status");
  const db = database();
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const previousMonthStart = new Date(monthStart);
  previousMonthStart.setMonth(previousMonthStart.getMonth() - 1);
  const firstMonth = new Date(monthStart);
  firstMonth.setMonth(firstMonth.getMonth() - 11);

  const [clientSummary, revenueSummary, statusRows, pipelineRows, monthlyRevenueRows, monthlyClientRows, adherence, serviceRows, revenueServiceRows, invoiceRows] = await Promise.all([
    db("clients")
      .select(db.raw("COUNT(*) as total"))
      .select(db.raw("SUM(status = 'active') as active"))
      .select(db.raw("SUM(status = 'churned') as churned"))
      .first(),
    db("invoices")
      .select(db.raw("COALESCE(SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END), 0) as lifetime"))
      .select(db.raw("COALESCE(SUM(CASE WHEN status = 'paid' AND paid_at >= ? THEN amount ELSE 0 END), 0) as current", [monthStart]))
      .select(db.raw("COALESCE(SUM(CASE WHEN status = 'paid' AND paid_at >= ? AND paid_at < ? THEN amount ELSE 0 END), 0) as previous", [previousMonthStart, monthStart]))
      .first(),
    db("clients").select("status").count({ total: "*" }).groupBy("status"),
    db("clients").select("pipeline_stage").count({ total: "*" }).groupBy("pipeline_stage"),
    db("invoices")
      .select(db.raw("DATE_FORMAT(paid_at, '%Y-%m') as month"))
      .sum({ total: "amount" })
      .where({ status: "paid" })
      .where("paid_at", ">=", firstMonth)
      .groupByRaw("DATE_FORMAT(paid_at, '%Y-%m')")
      .orderBy("month"),
    db("clients")
      .select(db.raw("DATE_FORMAT(COALESCE(joined_at, created_at), '%Y-%m') as month"))
      .count({ total: "*" })
      .whereRaw("COALESCE(joined_at, created_at) >= ?", [firstMonth])
      .groupByRaw("DATE_FORMAT(COALESCE(joined_at, created_at), '%Y-%m')")
      .orderBy("month"),
    db("check_ins").avg({ diet: "diet_adherence_pct", workout: "workout_completion_pct", energy: "energy_score", sleep: "sleep_score" }).first(),
    db("services")
      .select("services.id", "services.name", "services.type", "services.tier")
      .select(db.raw("(SELECT COUNT(*) FROM clients WHERE clients.service_id = services.id) as client_count"))
      .select(db.raw("(SELECT COALESCE(SUM(invoices.amount), 0) FROM invoices WHERE invoices.service_id = services.id AND invoices.status = 'paid') as paid_revenue"))
      .select(db.raw("(SELECT COUNT(*) FROM sessions WHERE sessions.service_id = services.id AND sessions.attendance = 'attended') as attended_sessions"))
      .orderByRaw("paid_revenue DESC, client_count DESC, services.name ASC"),
    db("services")
      .select("services.name")
      .sum({ total: "invoices.amount" })
      .join("invoices", "invoices.service_id", "services.id")
      .where("invoices.status", "paid")
      .groupBy("services.id", "services.name")
      .orderBy("total", "desc"),
    db("invoices")
      .select("invoices.id", "invoices.number", "invoices.amount", "invoices.currency", "invoices.status", "invoices.due_on", "invoices.paid_at", "users.name as client", "services.name as service")
      .join("clients", "clients.id", "invoices.client_id")
      .join("users", "users.id", "clients.user_id")
      .leftJoin("services", "services.id", "invoices.service_id")
      .orderBy("invoices.created_at", "desc")
      .limit(8),
  ]);
  const statusData = statusRows as Array<{ status: string; total: number | string }>;
  const pipelineData = pipelineRows as Array<{ pipeline_stage: string; total: number | string }>;
  const revenueMap = new Map(
    (monthlyRevenueRows as Array<{ month: string; total: number | string }>).map((row) => [row.month, numeric(row.total)]),
  );
  const clientMap = new Map(
    (monthlyClientRows as Array<{ month: string; total: number | string }>).map((row) => [row.month, numeric(row.total)]),
  );
  const months = Array.from({ length: 12 }, (_, index) => {
    const date = new Date(firstMonth.getFullYear(), firstMonth.getMonth() + index, 1);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    return { key, label: date.toLocaleDateString("en-US", { month: "short" }) };
  });
  const totalClients = numeric(clientSummary?.total);
  const churnedClients = numeric(clientSummary?.churned);
  const tones = ["green", "amber", "slate", "blue"] as const;
  const statusSegments = statusData.map((row, index) => ({
    label: statusLabel(ts, row.status),
    value: numeric(row.total),
    tone: tones[index % tones.length],
  }));
  const revenueSegments = (revenueServiceRows as Array<{ name: string; total: number | string }>).map((row, index) => ({ label: row.name, value: numeric(row.total), tone: tones[index % tones.length] }));
  const analyticsData: CoachAnalyticsData = {
    activeClients: numeric(clientSummary?.active),
    totalClients,
    retentionRate: totalClients ? Math.round(((totalClients - churnedClients) / totalClients) * 100) : 0,
    currentRevenue: numeric(revenueSummary?.current),
    previousRevenue: numeric(revenueSummary?.previous),
    lifetimeRevenue: numeric(revenueSummary?.lifetime),
    averageDiet: numeric(adherence?.diet), averageWorkout: numeric(adherence?.workout),
    averageEnergy: numeric(adherence?.energy), averageSleep: numeric(adherence?.sleep),
    revenueTrend: months.map((month) => ({ label: month.label, value: revenueMap.get(month.key) || 0 })),
    clientGrowth: months.map((month) => ({ label: month.label, value: clientMap.get(month.key) || 0 })),
    pipeline: ["lead", "onboarding", "active", "renewal"].map((stage) => ({ label: statusLabel(ts, stage), value: numeric(pipelineData.find((row) => row.pipeline_stage === stage)?.total) })),
    statusSegments,
    revenueSegments,
    services: (serviceRows as Array<Record<string, unknown>>).map((row) => ({ id: numeric(row.id), name: String(row.name), type: String(row.type), tier: row.tier ? String(row.tier) : null, clients: numeric(row.client_count), paidRevenue: numeric(row.paid_revenue), attendedSessions: numeric(row.attended_sessions) })),
    invoices: (invoiceRows as Array<Record<string, unknown>>).map((row) => ({ id: numeric(row.id), number: String(row.number), client: String(row.client), service: row.service ? String(row.service) : null, amount: numeric(row.amount), currency: String(row.currency || "USD"), status: String(row.status), dueOn: new Date(String(row.due_on)).toISOString(), paidAt: row.paid_at ? new Date(String(row.paid_at)).toISOString() : null })),
    generatedAt: new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" }).format(new Date()),
  };
  return <CoachAnalyticsDashboard data={analyticsData} />;
}

async function CoachSettings() {
  return <AccountSettingsPage role="coach" />;
}

async function CoachProfile() { return <AccountProfilePage role="coach" />; }

async function CoachMessages({ coachId, initialClientId }: { coachId: number; initialClientId?: number | null }) {
  const t = await getTranslations("MessagesPanel");
  const threads = await loadCoachMessageThreads(coachId);
  const unread = threads.reduce((total, thread) => total + thread.unreadCount, 0);
  return (
    <>
      <PageHeader
        eyebrow={t("eyebrow")}
        title={t("title")}
        description={t("description")}
        actions={<Badge tone={unread ? "blue" : "success"}>{unread ? t("unreadCount", { count: unread }) : t("inboxClear")}</Badge>}
      />
      <MessagingWorkspace role="coach" currentUserId={coachId} threads={threads} initialParticipantId={initialClientId} />
    </>
  );
}

async function CoachSchedule({ selectedClientId }: { selectedClientId?: number | null }) {
  const t = await getTranslations("Schedule");
  const db = database();
  const clientRows = await db("clients")
    .select("clients.id", "users.name")
    .join("users", "users.id", "clients.user_id")
    .whereNot("clients.status", "churned")
    .orderBy("users.name");
  const clients = clientRows.map((row) => ({ id: numeric(row.id), name: String(row.name) }));

  let workoutPlans: SchedulerPlan[] = [];
  let dietPlans: SchedulerDiet[] = [];
  const schedule: SchedulerSlot[] = Array.from({ length: 7 }, (_, weekday) => ({ weekday, workoutPlanId: null, workoutDay: null, dietPlanId: null, isRest: false }));

  if (selectedClientId) {
    const [workoutRows, dietRows, scheduleRows] = await Promise.all([
      db("workout_plans").select("id", "title", "exercises").where({ client_id: selectedClientId }).orderBy("updated_at", "desc"),
      db("diet_plans").select("id", "title").where({ client_id: selectedClientId }).orderBy("updated_at", "desc"),
      db("client_week_schedule").where({ client_id: selectedClientId }),
    ]);
    workoutPlans = workoutRows.map((row) => ({ id: numeric(row.id), title: String(row.title), days: planDays(row.exercises) }));
    dietPlans = dietRows.map((row) => ({ id: numeric(row.id), title: String(row.title) }));
    const byWeekday = new Map(scheduleRows.map((row) => [Number(row.weekday), row]));
    for (let weekday = 0; weekday < 7; weekday += 1) {
      const row = byWeekday.get(weekday);
      if (row) {
        schedule[weekday] = {
          weekday,
          workoutPlanId: row.workout_plan_id ? Number(row.workout_plan_id) : null,
          workoutDay: row.workout_day ? String(row.workout_day) : null,
          dietPlanId: row.diet_plan_id ? Number(row.diet_plan_id) : null,
          isRest: Boolean(row.is_rest),
        };
      }
    }
  }

  return (
    <>
      <PageHeader eyebrow={t("eyebrow")} title={t("title")} description={t("description")} />
      <WeekScheduler clients={clients} selectedClientId={selectedClientId ?? null} workoutPlans={workoutPlans} dietPlans={dietPlans} schedule={schedule} />
    </>
  );
}

export async function RealCoachSection({
  section = "home",
  selectedClientId,
  selectedTransformationId,
}: {
  section?: string;
  selectedClientId?: number | null;
  selectedTransformationId?: number | null;
}) {
  const session = await requireRole("coach");
  if (section === "home") return <CoachOverview />;
  if (section === "clients") return <CoachClients selectedClientId={selectedClientId} />;
  if (section === "consultations") return <CoachConsultations />;
  if (section === "packages") return <CoachPackagesPage />;
  if (section === "transformations") return <CoachTransformations selectedTransformationId={selectedTransformationId} />;
  if (section === "personal-training") return <CoachPersonalTraining />;
  if (section === "check-ins") return <CoachCheckIns />;
  if (section === "diet-plans") return <CoachDietPlansPage />;
  if (section === "workout-plans") return <CoachWorkoutPlansPage />;
  if (section === "schedule") return <CoachSchedule selectedClientId={selectedClientId} />;
  if (section === "messages") return <CoachMessages coachId={session.id} initialClientId={selectedClientId} />;
  if (section === "analytics") return <CoachAnalytics />;
  if (section === "profile") return <CoachProfile />;
  if (section === "settings") return <CoachSettings />;
  return <CoachListSection section={section} />;
}
