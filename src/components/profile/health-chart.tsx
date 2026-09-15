"use client";

import { useLocale, useTranslations } from "next-intl";
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export type HealthChartPoint = { date: string; [key: string]: string | number | null };

export function HealthChart({ data, series, unit = "", max }: { data: HealthChartPoint[]; series: { key: string; label: string }[]; unit?: string; max?: number }) {
  const t = useTranslations("HealthProgress");
  const locale = useLocale();
  const date = (value: string) => new Date(`${value}T12:00:00Z`).toLocaleDateString(locale, { month: "short", day: "numeric", timeZone: "UTC" });
  if (!data.some((row) => series.some(({ key }) => typeof row[key] === "number"))) return <p className="chart-empty">{t("noData")}</p>;
  return <>
    <div className="health-chart">
      <ResponsiveContainer width="100%" height="100%" minWidth={0}>
        <LineChart data={data} margin={{ top: 12, right: 12, bottom: 8, left: 0 }} accessibilityLayer>
          <CartesianGrid stroke="var(--line)" vertical={false} />
          <XAxis dataKey="date" tickFormatter={date} minTickGap={35} tick={{ fill: "var(--muted)", fontSize: 11 }} />
          <YAxis domain={[0, max ?? "auto"]} width={48} tick={{ fill: "var(--muted)", fontSize: 11 }} />
          <Tooltip labelFormatter={(value) => date(String(value))} formatter={(value) => `${Number(value).toLocaleString(locale, { maximumFractionDigits: 2 })}${unit ? ` ${unit}` : ""}`} contentStyle={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 12, color: "var(--text)" }} />
          {series.length > 1 && <Legend />}
          {series.map(({ key, label }, index) => <Line key={key} name={label} dataKey={key} type="linear" stroke={index ? "var(--muted)" : "var(--primary)"} strokeWidth={2.5} strokeDasharray={index ? "5 5" : undefined} dot={{ r: 3 }} connectNulls={false} isAnimationActive={false} />)}
        </LineChart>
      </ResponsiveContainer>
    </div>
    <details className="health-chart-data"><summary>{t("viewData")}</summary><div className="data-table-wrap"><table className="data-table"><thead><tr><th>{t("date")}</th>{series.map(({ key, label }) => <th key={key}>{label}{unit ? ` (${unit})` : ""}</th>)}</tr></thead><tbody>{data.map((row) => <tr key={row.date}><td>{row.date}</td>{series.map(({ key }) => <td key={key}>{row[key] == null ? "—" : Number(row[key]).toLocaleString(locale, { maximumFractionDigits: 2 })}</td>)}</tr>)}</tbody></table></div></details>
  </>;
}
