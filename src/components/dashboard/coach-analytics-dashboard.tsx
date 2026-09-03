import { Activity, Dumbbell, ReceiptText, ShieldCheck, TrendingUp, Users } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { statusLabel } from "@/lib/status-labels";
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

function invoiceTone(status: string): "success" | "warning" | "danger" | "neutral" {
  if (status === "paid") return "success";
  if (status === "overdue") return "danger";
  if (status === "unpaid") return "warning";
  return "neutral";
}

type ConsistencyItem = { label: string; value: number; icon: React.ReactNode };

function VerticalBars({ data }: { data: AnalyticsPoint[] }) {
  const max = Math.max(...data.map((point) => point.value), 1);
  return <div className="analytics-column-chart" role="img" aria-label={data.map((point) => `${point.label}: ${point.value}`).join(", ")}>
    {data.map((point) => <div className="analytics-column" key={point.label}><div className="analytics-column-value">{point.value}</div><div className="analytics-column-track"><span style={{ height: `${Math.max((point.value / max) * 100, point.value ? 10 : 2)}%` }} /></div><small>{point.label}</small></div>)}
  </div>;
}

function ConsistencyMetrics({ items }: { items: ConsistencyItem[] }) {
  return <div className="analytics-metric-list">{items.map((item) => <div className="analytics-metric" key={item.label}><span>{item.icon}</span><div><div><strong>{item.label}</strong><b>{item.value}%</b></div><div className="analytics-meter"><i style={{ width: `${item.value}%` }} /></div></div></div>)}</div>;
}

function revenueChange(current: number, previous: number, t: (key: string, values?: Record<string, string | number | Date>) => string) {
  if (!previous && !current) return { change: t("noPaidRevenueYet"), trend: "up" as const };
  if (!previous) return { change: t("newRevenueThisMonth"), trend: "up" as const };
  const delta = Math.round(((current - previous) / previous) * 100);
  return { change: t("vsLastMonth", { pct: Math.abs(delta) }), trend: delta >= 0 ? ("up" as const) : ("down" as const) };
}

const SERVICE_TYPE_KEYS: Record<string, string> = { consultation: "typeConsultation", diet: "typeDiet", workout: "typeWorkout", personal_training: "typePersonalTraining" };

export async function CoachAnalyticsDashboard({ data }: { data: CoachAnalyticsData }) {
  const t = await getTranslations("Analytics");
  const tc = await getTranslations("Common");
  const ts = await getTranslations("Common.status");
  const tt = await getTranslations("Common.tiers");
  const tServiceType = await getTranslations("Services");

  const revenueDelta = revenueChange(data.currentRevenue, data.previousRevenue, t);
  const activeRate = data.totalClients ? Math.round((data.activeClients / data.totalClients) * 100) : 0;
  const averageAdherence = Math.round((data.averageDiet + data.averageWorkout) / 2);
  const tierLabel = (value: string) => {
    const knownTier = ["beginner", "intermediate", "elite", "business", "athlete"].includes(value);
    if (knownTier) return tt(value);
    const typeKey = SERVICE_TYPE_KEYS[value];
    return typeKey ? tServiceType(typeKey) : value.replaceAll("_", " ");
  };
  const consistencyItems: ConsistencyItem[] = [
    { label: t("dietAdherence"), value: clamp(data.averageDiet), icon: <Activity size={15} /> },
    { label: t("workoutCompletion"), value: clamp(data.averageWorkout), icon: <Dumbbell size={15} /> },
    { label: t("energyScore"), value: clamp(data.averageEnergy * 10), icon: <TrendingUp size={15} /> },
    { label: t("sleepScore"), value: clamp(data.averageSleep * 10), icon: <ShieldCheck size={15} /> },
  ];
  return <div className="coach-analytics-dashboard">
    <PageHeader eyebrow={t("eyebrow")} title={t("title")} description={t("description")} />
    <div className="analytics-kpi-grid">
      <StatCard label={t("statRevenue")} value={money.format(data.currentRevenue)} change={revenueDelta.change} trend={revenueDelta.trend} note={t("lifetimePaidNote", { amount: money.format(data.lifetimeRevenue) })} icon={<TrendingUp size={18} />} accent="green" points={data.revenueTrend.map((point) => point.value)} />
      <StatCard label={t("statActiveClients")} value={String(data.activeClients)} change={t("activeRateChange", { rate: activeRate })} note={t("clientRecordsNote", { count: data.totalClients })} icon={<Users size={18} />} points={data.clientGrowth.map((point) => point.value)} />
      <StatCard label={t("statRetention")} value={`${data.retentionRate}%`} change={t("retentionChange")} note={t("retentionNote")} icon={<ShieldCheck size={18} />} accent="green" />
      <StatCard label={t("statAverageAdherence")} value={`${averageAdherence}%`} change={t("workoutsChange", { pct: Math.round(data.averageWorkout) })} note={t("nutritionNote", { pct: Math.round(data.averageDiet) })} icon={<Activity size={18} />} accent="amber" />
    </div>
    <div className="analytics-primary-grid">
      <Card className="chart-card analytics-revenue-card"><CardHead title={t("revenuePerformance")} meta={t("revenuePerformanceMeta")} action={<span className="analytics-period-pill">{t("twelveMonths")}</span>} /><TrendLineChart data={data.revenueTrend} valueLabel={t("paidRevenueLabel")} formatValue={(value) => money.format(value)} highestLabel={tc("chartHighest")} latestLabel={tc("chartLatest")} emptyLabel={tc("chartNoTrend")} /></Card>
      <Card className="chart-card analytics-revenue-mix"><CardHead title={t("revenueMix")} meta={t("revenueMixMeta")} action={<ReceiptText size={17} />} />{data.revenueSegments.length ? <RingChart segments={data.revenueSegments} centerValue={money.format(data.lifetimeRevenue)} centerLabel={t("paidRevenueCenter")} /> : <p className="chart-empty">{t("revenueMixEmpty")}</p>}</Card>
    </div>
    <div className="analytics-secondary-grid">
      <Card className="chart-card"><CardHead title={t("clientAcquisition")} meta={t("clientAcquisitionMeta")} action={<Users size={17} />} /><VerticalBars data={data.clientGrowth} /></Card>
      <Card className="chart-card"><CardHead title={t("clientJourney")} meta={t("clientJourneyMeta")} action={<ShieldCheck size={17} />} /><HorizontalBars items={data.pipeline.map((point) => ({ label: point.label, value: point.value }))} valueLabel={t("clientsLabel")} emptyLabel={tc("chartNoCategory")} /></Card>
      <Card className="chart-card"><CardHead title={t("coachingConsistency")} meta={t("coachingConsistencyMeta")} action={<Activity size={17} />} /><ConsistencyMetrics items={consistencyItems} /></Card>
    </div>
    <div className="analytics-detail-grid">
      <Card className="analytics-service-table-card"><CardHead title={t("servicePerformance")} meta={t("servicePerformanceMeta")} /><div className="data-table-wrap analytics-table-wrap"><table className="data-table analytics-table"><thead><tr><th>{t("colService")}</th><th>{t("colType")}</th><th>{t("colClients")}</th><th>{t("colPaidRevenue")}</th><th>{t("colAttendedSessions")}</th></tr></thead><tbody>{data.services.map((service) => <tr key={service.id}><td><strong>{service.name}</strong></td><td><Badge tone="blue">{tierLabel(service.tier || service.type)}</Badge></td><td>{service.clients}</td><td>{money.format(service.paidRevenue)}</td><td>{service.attendedSessions}</td></tr>)}</tbody></table></div></Card>
      <Card className="analytics-client-health-card"><CardHead title={t("clientHealth")} meta={t("clientHealthMeta")} /><RingChart segments={data.statusSegments} centerValue={String(data.activeClients)} centerLabel={t("activeClientsCenter")} /></Card>
    </div>
    <Card className="analytics-invoice-card"><CardHead title={t("latestInvoices")} meta={t("latestInvoicesMeta")} />{data.invoices.length ? <div className="data-table-wrap analytics-table-wrap"><table className="data-table analytics-table"><thead><tr><th>{t("colInvoice")}</th><th>{t("colClient")}</th><th>{t("colService")}</th><th>{t("colAmount")}</th><th>{t("colDue")}</th><th>{t("colStatus")}</th></tr></thead><tbody>{data.invoices.map((invoice) => <tr key={invoice.id}><td><strong>{invoice.number}</strong></td><td>{invoice.client}</td><td>{invoice.service || t("unassigned")}</td><td>{money.format(invoice.amount)}</td><td>{dateOnly.format(new Date(invoice.dueOn))}</td><td><Badge tone={invoiceTone(invoice.status)}>{statusLabel(ts, invoice.status)}</Badge></td></tr>)}</tbody></table></div> : <p className="chart-empty">{t("noInvoicesYet")}</p>}</Card>
  </div>;
}
