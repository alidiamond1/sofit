import {
  Activity,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  CircleDollarSign,
  ClipboardList,
  Dumbbell,
  Mail,
  TrendingUp,
  Users,
} from "lucide-react";
import Link from "next/link";
import { requireRole } from "@/lib/auth/session";
import { database } from "@/lib/db";
import { CoachPackages } from "@/components/packages/coach-packages";
import { CoachDietPlansPage, CoachWorkoutPlansPage } from "@/components/plans/coach-plan-pages";
import { HorizontalBars, RingChart, TrendLineChart } from "./charts";
import { Avatar, Badge, Card, CardHead, PageHeader, ProgressBar, StatCard } from "./primitives";

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
  "settings",
];

const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
const dateTime = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
const dateOnly = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" });

function numeric(value: unknown) {
  return Number(value || 0);
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
          <CardHead title="Today's schedule" meta={`${schedule.length} database records`} />
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
        <CardHead title="Newest clients" meta="Latest database entries" />
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
  const [clients, pipeline] = await Promise.all([
    db("clients")
      .select(
        "clients.id",
        "clients.status",
        "clients.pipeline_stage",
        "clients.joined_at",
        "users.name",
        "users.email",
        "services.name as service",
        "packages.name as package_name",
        "packages.category as package_category",
        db.raw("COALESCE(ROUND(AVG((COALESCE(check_ins.diet_adherence_pct, 0) + COALESCE(check_ins.workout_completion_pct, 0)) / 2)), 0) as adherence"),
      )
      .join("users", "users.id", "clients.user_id")
      .leftJoin("services", "services.id", "clients.service_id")
      .leftJoin("packages", "packages.id", "clients.package_id")
      .leftJoin("check_ins", "check_ins.client_id", "clients.id")
      .groupBy("clients.id", "clients.status", "clients.pipeline_stage", "clients.joined_at", "users.name", "users.email", "services.name", "packages.name", "packages.category")
      .orderBy("clients.created_at", "desc"),
    db("clients").select("pipeline_stage").count({ total: "*" }).groupBy("pipeline_stage"),
  ]);
  const pipelineRows = pipeline as unknown as Array<{ pipeline_stage: string; total: number | string }>;
  const counts = new Map(pipelineRows.map((item) => [item.pipeline_stage, numeric(item.total)]));
  return (
    <>
      <PageHeader title="Clients" description="Only client accounts stored in MySQL are shown here." />
      <div className="pipeline">
        {["lead", "onboarding", "active", "renewal"].map((stage) => <Card className="pipeline-card" key={stage}><span>{stage}</span><strong>{counts.get(stage) || 0}</strong><small>clients</small></Card>)}
      </div>
      {clients.length === 0 ? <EmptyState text="Invite a client to begin onboarding." /> : <Card><div className="data-table-wrap"><table className="data-table"><thead><tr><th>Client</th><th>Package</th><th>Primary service</th><th>Status</th><th>Pipeline</th><th>Adherence</th><th>Joined</th></tr></thead><tbody>{clients.map((client, index) => <tr key={client.id}><td><div className="table-person"><Avatar name={client.name} tone={index} /><div><strong>{client.name}</strong><span>{client.email}</span></div></div></td><td>{client.package_name ? <div><strong>{client.package_name}</strong><br /><Badge>{client.package_category}</Badge></div> : "Not assigned"}</td><td>{client.service || "Not assigned"}</td><td><Badge tone={tone(client.status)}>{client.status}</Badge></td><td><Badge>{client.pipeline_stage}</Badge></td><td><ProgressBar value={numeric(client.adherence)} /></td><td>{client.joined_at ? dateOnly.format(new Date(client.joined_at)) : "-"}</td></tr>)}</tbody></table></div></Card>}
    </>
  );
}

async function CoachServices() {
  const services = await database()("services")
    .select("services.*")
    .select(database().raw("(SELECT COUNT(*) FROM clients WHERE clients.service_id = services.id) as client_count"))
    .orderBy("type")
    .orderBy("tier");
  return <><PageHeader title="Services" description="Services and prices stored in MySQL." />{services.length === 0 ? <EmptyState text="No service records exist yet." /> : <div className="service-grid">{services.map((service) => <Card className="service-card" key={service.id}><Badge tone={service.is_active ? "success" : "neutral"}>{service.is_active ? "Active" : "Inactive"}</Badge><h2>{service.name}</h2><p>{service.description || "No description"}</p><div className="service-price"><strong>{money.format(numeric(service.price))}</strong><span>{service.billing_interval}</span></div><div className="service-foot"><span>{numeric(service.client_count)} clients</span><Badge>{service.tier || service.type}</Badge></div></Card>)}</div>}</>;
}

async function CoachListSection({ section }: { section: string }) {
  const db = database();
  let title = "";
  let description = "";
  let rows: Array<Record<string, unknown>> = [];
  let columns: Array<{ key: string; label: string; format?: (value: unknown, row: Record<string, unknown>) => React.ReactNode }> = [];

  if (section === "consultations") {
    title = "Consultations"; description = "Bookings stored in MySQL.";
    rows = await db("consultations").select("consultations.*", "users.name as client").join("clients", "clients.id", "consultations.client_id").join("users", "users.id", "clients.user_id").orderBy("starts_at", "desc");
    columns = [{ key: "client", label: "Client" }, { key: "starts_at", label: "Starts", format: (v) => dateTime.format(new Date(String(v))) }, { key: "duration_minutes", label: "Minutes" }, { key: "status", label: "Status", format: (v) => <Badge tone={tone(String(v))}>{String(v)}</Badge> }, { key: "session_notes", label: "Notes", format: (v) => String(v || "-") }];
  } else if (section === "diet-plans" || section === "workout-plans") {
    const diet = section === "diet-plans";
    title = diet ? "Diet plans" : "Workout plans"; description = `${title} stored and assigned in MySQL.`;
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
    title = "Payments"; description = "Invoice records stored locally in MySQL.";
    rows = await db("invoices").select("invoices.*", "users.name as client", "services.name as service").join("clients", "clients.id", "invoices.client_id").join("users", "users.id", "clients.user_id").leftJoin("services", "services.id", "invoices.service_id").orderBy("due_on", "desc");
    columns = [{ key: "number", label: "Invoice" }, { key: "client", label: "Client" }, { key: "service", label: "Service", format: (v) => String(v || "-") }, { key: "amount", label: "Amount", format: (v) => money.format(numeric(v)) }, { key: "due_on", label: "Due", format: (v) => dateOnly.format(new Date(String(v))) }, { key: "status", label: "Status", format: (v) => <Badge tone={tone(String(v))}>{String(v)}</Badge> }];
  } else if (section === "messages") {
    title = "Messages"; description = "Private messages saved in MySQL.";
    rows = await db("messages").select("messages.*", "sender.name as sender", "recipient.name as recipient").join("users as sender", "sender.id", "messages.sender_id").join("users as recipient", "recipient.id", "messages.recipient_id").orderBy("messages.created_at", "desc").limit(100);
    columns = [{ key: "sender", label: "From" }, { key: "recipient", label: "To" }, { key: "body", label: "Message" }, { key: "created_at", label: "Sent", format: (v) => dateTime.format(new Date(String(v))) }];
  }

  return <><PageHeader title={title} description={description} />{rows.length === 0 ? <EmptyState text={`No ${title.toLowerCase()} records exist yet.`} /> : <Card><div className="data-table-wrap"><table className="data-table"><thead><tr>{columns.map((column) => <th key={column.key}>{column.label}</th>)}</tr></thead><tbody>{rows.map((row, index) => <tr key={String(row.id || index)}>{columns.map((column) => <td key={column.key}>{column.format ? column.format(row[column.key], row) : String(row[column.key] ?? "-")}</td>)}</tr>)}</tbody></table></div></Card>}</>;
}

async function CoachAnalytics() {
  const db = database();
  const firstMonth = new Date();
  firstMonth.setDate(1);
  firstMonth.setHours(0, 0, 0, 0);
  firstMonth.setMonth(firstMonth.getMonth() - 5);
  const [clients, revenue, retention, servicePerformance, monthlyRevenueRows, adherence] = await Promise.all([
    db("clients").count({ total: "*" }).first(),
    db("invoices").where({ status: "paid" }).sum({ total: "amount" }).first(),
    db("clients").select("status").count({ total: "*" }).groupBy("status"),
    db("services").select("services.name").count({ clients: "clients.id" }).leftJoin("clients", "clients.service_id", "services.id").groupBy("services.id", "services.name").orderBy("clients", "desc"),
    db("invoices")
      .select(db.raw("DATE_FORMAT(paid_at, '%Y-%m') as month"))
      .sum({ total: "amount" })
      .where({ status: "paid" })
      .where("paid_at", ">=", firstMonth)
      .groupByRaw("DATE_FORMAT(paid_at, '%Y-%m')")
      .orderBy("month"),
    db("check_ins").avg({ diet: "diet_adherence_pct", workout: "workout_completion_pct" }).first(),
  ]);
  const retentionRows = retention as unknown as Array<{ status: string; total: number | string }>;
  const performanceRows = servicePerformance as unknown as Array<{ name: string; clients: number | string }>;
  const statusCounts = new Map(retentionRows.map((item) => [item.status, numeric(item.total)]));
  const revenueMap = new Map(
    (monthlyRevenueRows as Array<{ month: string; total: number | string }>).map((row) => [row.month, numeric(row.total)]),
  );
  const revenueTrend = Array.from({ length: 6 }, (_, index) => {
    const date = new Date(firstMonth.getFullYear(), firstMonth.getMonth() + index, 1);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    return { label: date.toLocaleDateString("en-US", { month: "short" }), value: revenueMap.get(key) || 0 };
  });
  const statusSegments = retentionRows.map((row, index) => ({
    label: row.status,
    value: numeric(row.total),
    tone: (["green", "amber", "slate", "blue"][index % 4]) as "green" | "amber" | "slate" | "blue",
  }));
  return (
    <>
      <PageHeader
        eyebrow="Business intelligence"
        title="Analytics"
        description="A focused view of revenue, retention, service demand, and client consistency."
      />
      <div className="stats-grid">
        <StatCard label="Total clients" value={String(numeric(clients?.total))} icon={<Users size={18} />} />
        <StatCard label="Paid revenue" value={money.format(numeric(revenue?.total))} icon={<TrendingUp size={18} />} accent="green" points={revenueTrend.map((point) => point.value)} />
        <StatCard label="Avg. diet adherence" value={`${Math.round(numeric(adherence?.diet))}%`} icon={<Activity size={18} />} accent="green" />
        <StatCard label="Avg. workout completion" value={`${Math.round(numeric(adherence?.workout))}%`} icon={<Dumbbell size={18} />} />
      </div>
      <div className="analytics-grid">
        <Card className="chart-card analytics-revenue">
          <CardHead title="Revenue trend" meta="Paid invoices over the last six months" />
          <TrendLineChart data={revenueTrend} valueLabel="Revenue" formatValue={(value) => money.format(value)} />
        </Card>
        <Card className="chart-card">
          <CardHead title="Client retention" meta="Live client status distribution" />
          <RingChart segments={statusSegments} centerValue={String(statusCounts.get("active") || 0)} centerLabel="active" />
        </Card>
        <Card className="chart-card analytics-services">
          <CardHead title="Service performance" meta="Clients assigned to each offering" />
          <HorizontalBars items={performanceRows.map((service) => ({ label: service.name, value: numeric(service.clients) }))} />
        </Card>
      </div>
    </>
  );
}

async function CoachSettings() {
  const user = await requireRole("coach");
  const record = await database()("users").select("name", "email", "created_at", "is_active").where({ id: user.id }).first();
  return <><PageHeader title="Settings" description="Coach account details read from MySQL." /><Card><CardHead title="Coach account" meta="Authentication identity" /><div className="simple-rows"><div><Avatar name={record.name} /><div><strong>{record.name}</strong><span>{record.email}</span></div><Badge tone={record.is_active ? "success" : "danger"}>{record.is_active ? "active" : "disabled"}</Badge></div><div><span className="task-icon mint"><CalendarDays size={16} /></span><div><strong>Created</strong><span>{dateOnly.format(new Date(record.created_at))}</span></div></div></div></Card></>;
}

export async function RealCoachSection({ section = "home" }: { section?: string }) {
  await requireRole("coach");
  if (section === "home") return <CoachOverview />;
  if (section === "clients") return <CoachClients />;
  if (section === "services") return <CoachServices />;
  if (section === "packages") return <CoachPackages />;
  if (section === "diet-plans") return <CoachDietPlansPage />;
  if (section === "workout-plans") return <CoachWorkoutPlansPage />;
  if (section === "analytics") return <CoachAnalytics />;
  if (section === "settings") return <CoachSettings />;
  return <CoachListSection section={section} />;
}
