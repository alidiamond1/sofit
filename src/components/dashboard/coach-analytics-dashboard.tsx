import { Activity, Database, Dumbbell, ReceiptText, ShieldCheck, TrendingUp, Users } from "lucide-react";
import { HorizontalBars, RingChart, TrendLineChart } from "./charts";
import { Badge, Card, CardHead, PageHeader, StatCard } from "./primitives";

export type AnalyticsPoint = { label: string; value: number };
export type AnalyticsServiceRow = { id: number; name: string; type: string; tier: string | null; clients: number; paidRevenue: number; attendedSessions: number };
export type AnalyticsInvoiceRow = { id: number; number: string; client: string; service: string | null; amount: number; currency: string; status: string; dueOn: string; paidAt: string | null };
export type CoachAnalyticsData = {
  activeClients: number; totalClients: number; retentionRate: number;
  currentRevenue: number; previousRevenue: number; lifetimeRevenue: number;
  averageDiet: number; averageWorkout: number; averageEnergy: number; averageSleep: number;
  revenueTrend: AnalyticsPoint[]; clientGrowth: AnalyticsPoint[]; pipeline: AnalyticsPoint[];
  statusSegments: Array<AnalyticsPoint & { tone: "blue" | "green" | "amber" | "slate" }>;
  revenueSegments: Array<AnalyticsPoint & { tone: "blue" | "green" | "amber" | "slate" }>;
  services: AnalyticsServiceRow[]; invoices: AnalyticsInvoiceRow[]; generatedAt: string;
};

const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
const dateOnly = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" });
const clamp = (value: number) => Math.max(0, Math.min(100, Math.round(value)));

function revenueChange(current: number, previous: number) {
  if (!previous && !current) return { change: "No paid revenue yet", trend: "up" as const };
  if (!previous) return { change: "New revenue this month", trend: "up" as const };
  const delta = Math.round(((current - previous) / previous) * 100);
  return { change: `${Math.abs(delta)}% vs last month`, trend: delta >= 0 ? ("up" as const) : ("down" as const) };
}

function VerticalBars({ data }: { data: AnalyticsPoint[] }) {
  const max = Math.max(...data.map((point) => point.value), 1);
  return <div className="analytics-column-chart" role="img" aria-label={data.map((point) => `${point.label}: ${point.value} new clients`).join(", ")}>
    {data.map((point) => <div className="analytics-column" key={point.label}><div className="analytics-column-value">{point.value}</div><div className="analytics-column-track"><span style={{ height: `${Math.max((point.value / max) * 100, point.value ? 10 : 2)}%` }} /></div><small>{point.label}</small></div>)}
  </div>;
}

function ConsistencyMetrics({ data }: { data: CoachAnalyticsData }) {
  const items = [
    { label: "Diet adherence", value: clamp(data.averageDiet), icon: <Activity size={15} /> },
    { label: "Workout completion", value: clamp(data.averageWorkout), icon: <Dumbbell size={15} /> },
    { label: "Energy score", value: clamp(data.averageEnergy * 10), icon: <TrendingUp size={15} /> },
    { label: "Sleep score", value: clamp(data.averageSleep * 10), icon: <ShieldCheck size={15} /> },
  ];
  return <div className="analytics-metric-list">{items.map((item) => <div className="analytics-metric" key={item.label}><span>{item.icon}</span><div><div><strong>{item.label}</strong><b>{item.value}%</b></div><div className="analytics-meter"><i style={{ width: `${item.value}%` }} /></div></div></div>)}</div>;
}

function invoiceTone(status: string): "success" | "warning" | "danger" | "neutral" {
  if (status === "paid") return "success";
  if (status === "overdue") return "danger";
  if (status === "unpaid") return "warning";
  return "neutral";
}

export function CoachAnalyticsDashboard({ data }: { data: CoachAnalyticsData }) {
  const revenueDelta = revenueChange(data.currentRevenue, data.previousRevenue);
  const activeRate = data.totalClients ? Math.round((data.activeClients / data.totalClients) * 100) : 0;
  const averageAdherence = Math.round((data.averageDiet + data.averageWorkout) / 2);
  return <div className="coach-analytics-dashboard">
    <PageHeader eyebrow="Business intelligence" title="Analytics centre" description="Revenue, client health, coaching delivery, and service demand in one decision-ready view." actions={<div className="analytics-live-source" title="Queried directly from the SoFit MySQL database"><i><Database size={15} /></i><span><strong>Live database</strong><small>No external analytics API</small></span></div>} />
    <div className="analytics-source-strip"><div><span className="analytics-live-dot" /><strong>MySQL data is live</strong><small>Last prepared {data.generatedAt}</small></div><p>Sources: <b>invoices</b>, <b>clients</b>, <b>check_ins</b>, <b>services</b>, and <b>sessions</b>.</p><Badge tone="success">Server verified</Badge></div>
    <div className="analytics-kpi-grid">
      <StatCard label="Revenue this month" value={money.format(data.currentRevenue)} change={revenueDelta.change} trend={revenueDelta.trend} note={`${money.format(data.lifetimeRevenue)} lifetime paid`} icon={<TrendingUp size={18} />} accent="green" points={data.revenueTrend.map((point) => point.value)} />
      <StatCard label="Active clients" value={String(data.activeClients)} change={`${activeRate}% of all clients`} note={`${data.totalClients} client records`} icon={<Users size={18} />} points={data.clientGrowth.map((point) => point.value)} />
      <StatCard label="Client retention" value={`${data.retentionRate}%`} change="Non-churned client rate" note="Calculated from current client status" icon={<ShieldCheck size={18} />} accent="green" />
      <StatCard label="Average adherence" value={`${averageAdherence}%`} change={`${Math.round(data.averageWorkout)}% workouts`} note={`${Math.round(data.averageDiet)}% nutrition`} icon={<Activity size={18} />} accent="amber" />
    </div>
    <div className="analytics-primary-grid">
      <Card className="chart-card analytics-revenue-card"><CardHead title="Revenue performance" meta="Paid invoices by month - rolling 12 months" action={<span className="analytics-period-pill">12 months</span>} /><TrendLineChart data={data.revenueTrend} valueLabel="Paid revenue" formatValue={(value) => money.format(value)} /></Card>
      <Card className="chart-card analytics-revenue-mix"><CardHead title="Revenue mix" meta="Paid revenue by service" action={<ReceiptText size={17} />} />{data.revenueSegments.length ? <RingChart segments={data.revenueSegments} centerValue={money.format(data.lifetimeRevenue)} centerLabel="paid revenue" /> : <p className="chart-empty">Paid invoices will build this chart.</p>}</Card>
    </div>
    <div className="analytics-secondary-grid">
      <Card className="chart-card"><CardHead title="Client acquisition" meta="New client records by month" action={<Users size={17} />} /><VerticalBars data={data.clientGrowth} /></Card>
      <Card className="chart-card"><CardHead title="Client journey" meta="Current pipeline distribution" action={<ShieldCheck size={17} />} /><HorizontalBars items={data.pipeline.map((point) => ({ label: point.label, value: point.value }))} valueLabel="clients" /></Card>
      <Card className="chart-card"><CardHead title="Coaching consistency" meta="Averages from submitted check-ins" action={<Activity size={17} />} /><ConsistencyMetrics data={data} /></Card>
    </div>
    <div className="analytics-detail-grid">
      <Card className="analytics-service-table-card"><CardHead title="Service performance" meta="Demand, paid revenue, and attended delivery" /><div className="data-table-wrap analytics-table-wrap"><table className="data-table analytics-table"><thead><tr><th>Service</th><th>Type</th><th>Clients</th><th>Paid revenue</th><th>Attended sessions</th></tr></thead><tbody>{data.services.map((service) => <tr key={service.id}><td><strong>{service.name}</strong></td><td><Badge tone="blue">{service.tier || service.type.replaceAll("_", " ")}</Badge></td><td>{service.clients}</td><td>{money.format(service.paidRevenue)}</td><td>{service.attendedSessions}</td></tr>)}</tbody></table></div></Card>
      <Card className="analytics-client-health-card"><CardHead title="Client health" meta="Current account status" /><RingChart segments={data.statusSegments} centerValue={String(data.activeClients)} centerLabel="active clients" /></Card>
    </div>
    <Card className="analytics-invoice-card"><CardHead title="Latest invoices" meta="Most recent billing activity from the invoices table" />{data.invoices.length ? <div className="data-table-wrap analytics-table-wrap"><table className="data-table analytics-table"><thead><tr><th>Invoice</th><th>Client</th><th>Service</th><th>Amount</th><th>Due</th><th>Status</th></tr></thead><tbody>{data.invoices.map((invoice) => <tr key={invoice.id}><td><strong>{invoice.number}</strong></td><td>{invoice.client}</td><td>{invoice.service || "Unassigned"}</td><td>{money.format(invoice.amount)}</td><td>{dateOnly.format(new Date(invoice.dueOn))}</td><td><Badge tone={invoiceTone(invoice.status)}>{invoice.status}</Badge></td></tr>)}</tbody></table></div> : <p className="chart-empty">No invoices have been created yet.</p>}</Card>
  </div>;
}
