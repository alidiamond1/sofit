"use client";

import { CheckCircle2, ChevronDown, Circle, Search, Users } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useState, type ReactNode } from "react";
import { groupPlanHistory, type PlanHistoryRecord } from "@/lib/plan-history";
import { statusLabel } from "@/lib/status-labels";
import { Badge, Card } from "@/components/dashboard/primitives";

export function PlanHistory({ plans, kind, today }: { plans: Array<PlanHistoryRecord & { actions: ReactNode }>; kind: "diet" | "workout"; today: string }) {
  const t = useTranslations("PlanHistory");
  const ts = useTranslations("Common.status");
  const locale = useLocale();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [progress, setProgress] = useState("");
  const [date, setDate] = useState(today);
  const groups = groupPlanHistory(plans, { search, status, progress, date });
  const dateLabel = (value: string) => new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(new Date(`${value}T00:00:00`));
  const reset = () => { setSearch(""); setStatus(""); setProgress(""); setDate(today); };

  return (
    <div className="plan-history">
      <div className="plan-history-toolbar">
        <label className="inline-search"><Search size={16} aria-hidden="true" /><input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder={t("search")} aria-label={t("search")} /></label>
        <div className="plan-history-filters">
          <label><span>{t("planStatus")}</span><select value={status} onChange={(event) => setStatus(event.target.value)}><option value="">{t("allStatuses")}</option>{["active", "draft", "archived"].map((value) => <option key={value} value={value}>{statusLabel(ts, value)}</option>)}</select></label>
          <label><span>{t("itemStatus")}</span><select value={progress} onChange={(event) => setProgress(event.target.value)}><option value="">{t("allItems")}</option><option value="done">{t("done")}</option><option value="pending">{t("pending")}</option></select></label>
          <label><span>{t("logDate")}</span><input type="date" value={date} max={today} onChange={(event) => setDate(event.target.value || today)} /></label>
        </div>
      </div>
      <div className="plan-history-caption"><p role="status">{t("results", { clients: groups.length, plans: groups.reduce((count, group) => count + group.plans.length, 0) })}</p>{search || status || progress || date !== today ? <button type="button" className="text-button" onClick={reset}>{t("reset")}</button> : null}</div>
      <p className="plan-history-hint">{t("dateHint", { date: dateLabel(date) })}</p>
      <div className="plan-history-stack">
        {groups.map((group) => (
          <details className="card plan-history-client" key={group.clientId}>
            <summary className="plan-history-client-head">
              <span className="plan-history-avatar" aria-hidden="true">{group.client.split(/\s+/).filter(Boolean).slice(0, 2).map((name) => name[0]).join("")}</span>
              <div className="plan-history-client-name"><h3>{group.client}</h3><span>{t("plansCount", { count: group.plans.length })}</span></div>
              <span className="plan-history-client-count">{t("activeCount", { count: group.plans.filter((plan) => plan.status === "active").length })}</span>
              <ChevronDown className="plan-history-chevron" size={18} aria-hidden="true" />
            </summary>
            <div className="plan-history-records">
              {group.plans.map((plan) => {
                const done = plan.items.filter((item) => item.dates.includes(date)).length;
                const items = plan.items.filter((item) => !progress || item.dates.includes(date) === (progress === "done"));
                return (
                  <details className="plan-history-record" key={plan.id} open={plan.status === "active"}>
                    <summary className="plan-history-record-head">
                      <div className="plan-history-record-title"><h4>{plan.title}</h4><span>{t("version", { version: plan.version })}{plan.startsOn ? ` · ${t("starts", { date: dateLabel(plan.startsOn) })}` : ""}</span></div>
                      <Badge tone={plan.status === "active" ? "success" : plan.status === "draft" ? "warning" : "neutral"}>{statusLabel(ts, plan.status)}</Badge>
                      <span className="plan-history-progress"><span>{t("loggedCount", { done, total: plan.items.length })}</span><progress value={done} max={plan.items.length || 1} aria-label={t("loggedCount", { done, total: plan.items.length })} /></span>
                      <ChevronDown className="plan-history-chevron" size={16} aria-hidden="true" />
                    </summary>
                    <div className="plan-history-record-body">
                      <div className="plan-history-record-meta"><span>{plan.metric == null ? "—" : t(kind === "diet" ? "calories" : "weeks", { value: plan.metric })}</span>{plan.actions}</div>
                      <ul className="plan-history-items">
                        {items.map((item, index) => {
                          const isDone = item.dates.includes(date);
                          return <li key={`${item.key}-${index}`}>
                            {isDone ? <CheckCircle2 size={17} className="plan-history-done" aria-hidden="true" /> : <Circle size={17} aria-hidden="true" />}
                            <span className="plan-history-item-name"><strong>{item.name}</strong>{item.day ? <span>{item.day}</span> : null}</span>
                            <Badge tone={isDone ? "success" : "neutral"}>{t(isDone ? "done" : "pending")}</Badge>
                          </li>;
                        })}
                      </ul>
                      {items.length === 0 ? <p className="plan-history-hint">{t("noItems")}</p> : null}
                    </div>
                  </details>
                );
              })}
            </div>
          </details>
        ))}
        {groups.length === 0 ? <Card className="empty-state"><Users size={24} /><h3>{t("noResults")}</h3><p>{t("tryFilters")}</p><button className="button secondary small" type="button" onClick={reset}>{t("reset")}</button></Card> : null}
      </div>
    </div>
  );
}
