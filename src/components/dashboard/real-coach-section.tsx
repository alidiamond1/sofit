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
import { requireRole } from "@/lib/auth/session";
import { database } from "@/lib/db";
import { CoachPackages } from "@/components/packages/coach-packages";
import { CoachDietPlansPage, CoachWorkoutPlansPage } from "@/components/plans/coach-plan-pages";
import { AccountProfilePage, AccountSettingsPage } from "@/components/profile/account-pages";
import { CoachServicesWorkspace, type EditableService } from "@/components/services/coach-services";
import { ClientDirectory, type ClientDirectoryRow } from "./client-directory";
import { CoachAnalyticsDashboard, type CoachAnalyticsData } from "./coach-analytics-dashboard";
import { RingChart, TrendLineChart } from "./charts";
import { Avatar, Badge, Card, CardHead, PageHeader, StatCard } from "./primitives";
import { MessagingWorkspace } from "@/components/messages/messaging-workspace";
import { loadCoachMessageThreads } from "@/lib/messages";

export const realCoachSections = [
  "clients",
  "invites",
  "services",
  "packages",
  "consultations",
  "diet-plans",
  "workout-plans",
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

function EmptyState({ text }: { text: string }) {
  return <Card className="empty-state"><ClipboardList size={24} /><h3>No records yet</h3><p>{text}</p></Card>;
}

async function CoachOverview() {
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
    label: row.status,
    value: numeric(row.total),
    tone: (["green", "amber", "slate", "blue"][index % 4]) as "green" | "amber" | "slate" | "blue",
  }));

  return (
    <>
      <PageHeader
        eyebrow={dateOnly.format(new Date())}
        title="Coach overview"
        description="Your coaching business, client momentum, and next priorities in one calm workspace."
        actions={<><Link className="button secondary" href="/coach/diet-plans">Build a plan</Link><Link className="button primary" href="/coach/invites"><Mail size={15} /> Invite client</Link></>}
      />
      <div className="stats-grid">
        <StatCard label="Active clients" value={String(numeric(activeClients?.total))} note="Currently coaching" icon={<Users size={18} />} accent="blue" />
        <StatCard label="Monthly revenue" value={money.format(numeric(monthlyRevenue?.total))} note="Paid this month" icon={<TrendingUp size={18} />} accent="green" points={revenueTrend.map((point) => point.value)} />
        <StatCard label="Plans to deliver" value={String(numeric(draftDietPlans?.total) + numeric(draftWorkoutPlans?.total))} note="Diet + workout drafts" icon={<Dumbbell size={18} />} accent="blue" />
        <StatCard label="Open reviews" value={String(numeric(pendingApplications?.total) + numeric(submittedCheckIns?.total) + numeric(overdueInvoices?.total))} note="Items needing attention" icon={<ClipboardList size={18} />} accent="amber" />
      </div>
      <div className="dashboard-insight-grid">
        <Card className="chart-card">
          <CardHead title="Revenue pulse" meta="Paid invoices - last 6 months" action={<Link className="text-button" href="/coach/analytics">Full analytics</Link>} />
          <TrendLineChart data={revenueTrend} valueLabel="Revenue" formatValue={(value) => money.format(value)} />
        </Card>
        <Card className="chart-card status-card">
          <CardHead title="Client health" meta="Current account status" action={<BarChart3 size={18} />} />
          <RingChart segments={clientStatuses} centerValue={String(numeric(activeClients?.total))} centerLabel="active" />
        </Card>
      </div>
      <div className="overview-grid">
        <Card>
          <CardHead title="Today's schedule" meta={`${schedule.length} scheduled items`} />
          <div className="simple-rows">
            {schedule.map((item, index) => (
              <div key={`${item.starts_at}-${index}`}>
                <span className="task-icon mint"><CalendarDays size={16} /></span>
                <div><strong>{item.name}</strong><span>{item.service || "Personal training"} - {dateTime.format(new Date(item.starts_at))}</span></div>
                <Badge tone={tone(item.status)}>{item.status}</Badge>
              </div>
            ))}
            {schedule.length === 0 ? <div><span>No sessions or consultations scheduled today.</span></div> : null}
          </div>
        </Card>
        <Card>
          <CardHead title="Needs attention" meta="Live task counts" />
          <div className="task-summary">
            <div><span className="task-icon mint"><ClipboardList size={18} /></span><p><strong>{numeric(draftDietPlans?.total) + numeric(draftWorkoutPlans?.total)} plans</strong><small>Drafts to complete</small></p></div>
            <div><span className="task-icon mint"><Mail size={18} /></span><p><strong>{numeric(pendingApplications?.total)} applications</strong><small>Waiting for your decision</small></p></div>
            <div><span className="task-icon sand"><CheckCircle2 size={18} /></span><p><strong>{numeric(submittedCheckIns?.total)} check-ins</strong><small>Waiting for review</small></p></div>
            <div><span className="task-icon rose"><CircleDollarSign size={18} /></span><p><strong>{numeric(overdueInvoices?.total)} invoices</strong><small>Marked overdue</small></p></div>
          </div>
        </Card>
      </div>
      <Card>
        <CardHead title="New applications" meta={`${numeric(pendingApplications?.total)} awaiting review`} action={<Link className="text-button" href="/coach/invites">View all applications</Link>} />
        <div className="simple-rows">
          {recentApplications.map((application) => {
            const answers = typeof application.intake_answers === "string" ? JSON.parse(application.intake_answers) : application.intake_answers || {};
            const name = answers.full_name || application.email;
            return <div key={application.id}><Avatar name={name} /><div><strong>{name}</strong><span>{application.email} - {application.user_id ? "account created" : "awaiting signup"}</span></div><Badge tone="warning">Review</Badge><Link className="button secondary small" href={`/coach/invites/${application.id}`}>Open</Link></div>;
          })}
          {recentApplications.length === 0 ? <div><span>No submitted applications are waiting.</span></div> : null}
        </div>
      </Card>
      <Card>
        <CardHead title="Newest clients" meta="Most recently added clients" />
        <div className="simple-rows">
          {recentClients.map((client, index) => <div key={client.id}><Avatar name={client.name} tone={index} /><div><strong>{client.name}</strong><span>{client.email} - {client.service || "No service assigned"}</span></div><Badge tone={tone(client.status)}>{client.status}</Badge><Badge>{client.pipeline_stage}</Badge></div>)}
          {recentClients.length === 0 ? <div><span>No clients have been created yet.</span></div> : null}
        </div>
      </Card>
    </>
  );
}

async function CoachClients() {
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
    joined: client.joined_at ? dateOnly.format(new Date(client.joined_at)) : "Not recorded",
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
        eyebrow="Client management"
        title="Your clients"
        description="Track every client from first contact to renewal, then focus on the people who need attention today."
        actions={<Link className="button primary" href="/coach/invites"><UserPlus size={16} /> Invite a client</Link>}
      />
      {directoryRows.length === 0 ? <EmptyState text="Invite a client to begin onboarding." /> : (
        <ClientDirectory
          clients={directoryRows}
          services={serviceOptions.map((service) => ({ id: numeric(service.id), name: String(service.name), isActive: Boolean(service.is_active) }))}
          packages={packageOptions.map((item) => ({ id: numeric(item.id), name: String(item.name), category: String(item.category), isActive: Boolean(item.is_active) }))}
        />
      )}
    </>
  );
}

async function CoachServices() {
  const db = database();
  const services = await db("services")
    .select("services.*")
    .select(db.raw("(SELECT COUNT(*) FROM clients WHERE clients.service_id = services.id) as client_count"))
    .select(db.raw("(SELECT COUNT(*) FROM package_services WHERE package_services.service_id = services.id) as package_count"))
    .orderBy("type")
    .orderBy("tier");
  const rows: EditableService[] = services.map((service) => ({
    id: numeric(service.id),
    name: String(service.name),
    type: String(service.type) as EditableService["type"],
    tier: service.tier ? String(service.tier) as EditableService["tier"] : null,
    price: numeric(service.price),
    billingInterval: String(service.billing_interval) as EditableService["billingInterval"],
    description: String(service.description || ""),
    isActive: Boolean(service.is_active),
    clientCount: numeric(service.client_count),
    packageCount: numeric(service.package_count),
  }));
  return <><PageHeader eyebrow="Coach controlled" title="Services" description="Create and manage coaching offers, pricing, availability, and client assignments." /><CoachServicesWorkspace services={rows} /></>;
}

async function CoachListSection({ section }: { section: string }) {
  const db = database();
  let title = "";
  let description = "";
  let rows: Array<Record<string, unknown>> = [];
  let columns: Array<{ key: string; label: string; format?: (value: unknown, row: Record<string, unknown>) => React.ReactNode }> = [];

  if (section === "consultations") {
    title = "Consultations"; description = "Scheduled and completed client consultation records.";
    rows = await db("consultations").select("consultations.*", "users.name as client").join("clients", "clients.id", "consultations.client_id").join("users", "users.id", "clients.user_id").orderBy("starts_at", "desc");
    columns = [{ key: "client", label: "Client" }, { key: "starts_at", label: "Starts", format: (v) => dateTime.format(new Date(String(v))) }, { key: "duration_minutes", label: "Minutes" }, { key: "status", label: "Status", format: (v) => <Badge tone={tone(String(v))}>{String(v)}</Badge> }, { key: "session_notes", label: "Notes", format: (v) => String(v || "-") }];
  } else if (section === "diet-plans" || section === "workout-plans") {
    const diet = section === "diet-plans";
    title = diet ? "Diet plans" : "Workout plans"; description = `${title} created and assigned to your clients.`;
    const table = diet ? "diet_plans" : "workout_plans";
    rows = await db(table).select(`${table}.*`, "users.name as client").join("clients", "clients.id", `${table}.client_id`).join("users", "users.id", "clients.user_id").orderBy(`${table}.updated_at`, "desc");
    columns = [{ key: "title", label: "Plan" }, { key: "client", label: "Client" }, { key: "version", label: "Version" }, { key: diet ? "daily_calories" : "weeks", label: diet ? "Calories" : "Weeks" }, { key: "status", label: "Status", format: (v) => <Badge tone={tone(String(v))}>{String(v)}</Badge> }, { key: "starts_on", label: "Starts", format: (v) => v ? dateOnly.format(new Date(String(v))) : "-" }];
  } else if (section === "personal-training") {
    title = "Personal training"; description = "Session records for assigned clients.";
    rows = await db("sessions").select("sessions.*", "users.name as client", "services.name as service", "services.tier").join("clients", "clients.id", "sessions.client_id").join("users", "users.id", "clients.user_id").leftJoin("services", "services.id", "sessions.service_id").orderBy("starts_at", "desc");
    columns = [{ key: "client", label: "Client" }, { key: "service", label: "Service", format: (v, row) => String(v || row.tier || "PT") }, { key: "starts_at", label: "Starts", format: (v) => dateTime.format(new Date(String(v))) }, { key: "duration_minutes", label: "Minutes" }, { key: "attendance", label: "Attendance", format: (v) => <Badge tone={tone(String(v))}>{String(v)}</Badge> }];
  } else if (section === "check-ins") {
    title = "Check-ins"; description = "Weekly submissions received from clients.";
    rows = await db("check_ins").select("check_ins.*", "users.name as client").join("clients", "clients.id", "check_ins.client_id").join("users", "users.id", "clients.user_id").orderBy("week_of", "desc");
    columns = [{ key: "client", label: "Client" }, { key: "week_of", label: "Week", format: (v) => dateOnly.format(new Date(String(v))) }, { key: "weight_kg", label: "Weight", format: (v) => v ? `${v} kg` : "-" }, { key: "diet_adherence_pct", label: "Diet" , format: (v) => `${numeric(v)}%`}, { key: "workout_completion_pct", label: "Workout", format: (v) => `${numeric(v)}%` }, { key: "status", label: "Status", format: (v) => <Badge tone={tone(String(v))}>{String(v)}</Badge> }];
  } else if (section === "payments") {
    title = "Payments"; description = "Client invoices, due dates, and payment status.";
    rows = await db("invoices").select("invoices.*", "users.name as client", "services.name as service").join("clients", "clients.id", "invoices.client_id").join("users", "users.id", "clients.user_id").leftJoin("services", "services.id", "invoices.service_id").orderBy("due_on", "desc");
    columns = [{ key: "number", label: "Invoice" }, { key: "client", label: "Client" }, { key: "service", label: "Service", format: (v) => String(v || "-") }, { key: "amount", label: "Amount", format: (v) => money.format(numeric(v)) }, { key: "due_on", label: "Due", format: (v) => dateOnly.format(new Date(String(v))) }, { key: "status", label: "Status", format: (v) => <Badge tone={tone(String(v))}>{String(v)}</Badge> }];
  } else if (section === "messages") {
    title = "Messages"; description = "Private conversations between you and your clients.";
    rows = await db("messages").select("messages.*", "sender.name as sender", "recipient.name as recipient").join("users as sender", "sender.id", "messages.sender_id").join("users as recipient", "recipient.id", "messages.recipient_id").orderBy("messages.created_at", "desc").limit(100);
    columns = [{ key: "sender", label: "From" }, { key: "recipient", label: "To" }, { key: "body", label: "Message" }, { key: "created_at", label: "Sent", format: (v) => dateTime.format(new Date(String(v))) }];
  }

  return <><PageHeader title={title} description={description} />{rows.length === 0 ? <EmptyState text={`No ${title.toLowerCase()} records exist yet.`} /> : <Card><div className="data-table-wrap"><table className="data-table"><thead><tr>{columns.map((column) => <th key={column.key}>{column.label}</th>)}</tr></thead><tbody>{rows.map((row, index) => <tr key={String(row.id || index)}>{columns.map((column) => <td key={column.key}>{column.format ? column.format(row[column.key], row) : String(row[column.key] ?? "-")}</td>)}</tr>)}</tbody></table></div></Card>}</>;
}

async function CoachAnalytics() {
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
    label: row.status,
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
    pipeline: ["lead", "onboarding", "active", "renewal"].map((stage) => ({ label: stage, value: numeric(pipelineData.find((row) => row.pipeline_stage === stage)?.total) })),
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
  const threads = await loadCoachMessageThreads(coachId);
  const unread = threads.reduce((total, thread) => total + thread.unreadCount, 0);
  return (
    <>
      <PageHeader
        eyebrow="Private coaching inbox"
        title="Messages"
        description="Keep every client conversation organized, respond to coaching needs, and see new messages immediately."
        actions={<Badge tone={unread ? "blue" : "success"}>{unread ? `${unread} unread` : "Inbox clear"}</Badge>}
      />
      <MessagingWorkspace role="coach" currentUserId={coachId} threads={threads} initialParticipantId={initialClientId} />
    </>
  );
}

export async function RealCoachSection({ section = "home", selectedClientId }: { section?: string; selectedClientId?: number | null }) {
  const session = await requireRole("coach");
  if (section === "home") return <CoachOverview />;
  if (section === "clients") return <CoachClients />;
  if (section === "services") return <CoachServices />;
  if (section === "packages") return <CoachPackages />;
  if (section === "diet-plans") return <CoachDietPlansPage />;
  if (section === "workout-plans") return <CoachWorkoutPlansPage />;
  if (section === "messages") return <CoachMessages coachId={session.id} initialClientId={selectedClientId} />;
  if (section === "analytics") return <CoachAnalytics />;
  if (section === "profile") return <CoachProfile />;
  if (section === "settings") return <CoachSettings />;
  return <CoachListSection section={section} />;
}
