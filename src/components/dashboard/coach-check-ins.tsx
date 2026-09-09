"use client";

import { Camera, ChevronDown, ClipboardCheck, ExternalLink, Search, X } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useActionState, useMemo, useState } from "react";
import { reviewCheckInAction, type CheckInActionState } from "@/app/actions/check-ins";
import { hasAnyProgressPhoto, type ProgressPhotos } from "@/lib/progress-photos";
import { filterCheckIns } from "@/lib/check-in-filters";
import { statusLabel } from "@/lib/status-labels";
import { ModalPortal } from "./modal-portal";
import { Badge, Card } from "./primitives";
import { ProgressPhotoCompare } from "./progress-photos";

const initialActionState: CheckInActionState = {};

export type CheckInRow = {
  id: number;
  clientId: number;
  client: string;
  weekOf: string;
  weightKg: number | null;
  dietPct: number;
  workoutPct: number;
  energy: number | null;
  sleep: number | null;
  clientNotes: string;
  coachFeedback: string;
  status: "pending" | "submitted" | "reviewed";
  progressPhotos: ProgressPhotos;
};

type Period = "week" | "month" | "year";

function tone(status: string): "success" | "warning" | "danger" | "neutral" {
  if (status === "reviewed") return "success";
  if (status === "submitted") return "warning";
  return "neutral";
}

const weekLabel = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" });
const monthLabel = new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" });

function periodKey(weekOf: string, period: Period) {
  if (period === "year") return weekOf.slice(0, 4);
  if (period === "month") return weekOf.slice(0, 7);
  return weekOf;
}

function periodLabel(key: string, period: Period) {
  if (period === "year") return key;
  if (period === "month") return monthLabel.format(new Date(`${key}-01T00:00:00`));
  return weekLabel.format(new Date(`${key}T00:00:00`));
}

function aggregate(rows: CheckInRow[], period: Period) {
  const map = new Map<string, { dietSum: number; workoutSum: number; count: number; latestWeight: number | null; latestWeekOf: string }>();
  for (const row of rows) {
    const key = periodKey(row.weekOf, period);
    const entry = map.get(key) || { dietSum: 0, workoutSum: 0, count: 0, latestWeight: null, latestWeekOf: "" };
    entry.dietSum += row.dietPct;
    entry.workoutSum += row.workoutPct;
    entry.count += 1;
    if (row.weekOf >= entry.latestWeekOf) {
      entry.latestWeekOf = row.weekOf;
      entry.latestWeight = row.weightKg;
    }
    map.set(key, entry);
  }
  return Array.from(map.entries())
    .map(([key, v]) => ({ key, label: periodLabel(key, period), avgDiet: Math.round(v.dietSum / v.count), avgWorkout: Math.round(v.workoutSum / v.count), weight: v.latestWeight, count: v.count }))
    .sort((a, b) => b.key.localeCompare(a.key));
}

function CheckInDetail({ row, previousRow, onClose }: { row: CheckInRow; previousRow: CheckInRow | null; onClose: () => void }) {
  const t = useTranslations("CheckIns");
  const tc = useTranslations("Common");
  const ts = useTranslations("Common.status");
  const [state, formAction, pending] = useActionState(async (previous: CheckInActionState, formData: FormData) => {
    const result = await reviewCheckInAction(previous, formData);
    if (result.success) onClose();
    return result;
  }, initialActionState);

  return (
    <ModalPortal>
      <div className="plan-modal-backdrop" role="presentation" onMouseDown={onClose}>
        <div className="plan-modal detail-modal" role="dialog" aria-modal="true" aria-label={t("detailAria", { client: row.client })} onMouseDown={(event) => event.stopPropagation()}>
          <button className="modal-close icon-button" type="button" aria-label={tc("close")} onClick={onClose}><X size={18} /></button>
          <div className="detail-panel">
            <div className="detail-head">
              <span className="eyebrow">{weekLabel.format(new Date(`${row.weekOf}T00:00:00`))}</span>
              <h2>{row.client}</h2>
              <Badge tone={tone(row.status)}>{statusLabel(ts, row.status)}</Badge>
            </div>
            <div className="detail-metrics">
              <div><strong>{row.weightKg ?? "—"}</strong><span>{t("weightKg")}</span></div>
              <div><strong>{row.dietPct}%</strong><span>{t("diet")}</span></div>
              <div><strong>{row.workoutPct}%</strong><span>{t("workout")}</span></div>
              <div><strong>{row.energy ?? "—"}</strong><span>{t("energy")}</span></div>
            </div>
            {hasAnyProgressPhoto(row.progressPhotos) || (previousRow && hasAnyProgressPhoto(previousRow.progressPhotos)) ? (
              <div className="detail-photos">
                <h4>{t("progressPhotosTitle")}</h4>
                <ProgressPhotoCompare
                  current={row.progressPhotos}
                  currentLabel={weekLabel.format(new Date(`${row.weekOf}T00:00:00`))}
                  previous={previousRow ? previousRow.progressPhotos : null}
                  previousLabel={previousRow ? weekLabel.format(new Date(`${previousRow.weekOf}T00:00:00`)) : undefined}
                  altPrefix={row.client}
                />
              </div>
            ) : null}
            <div className="detail-instructions">
              <h4>{t("clientNotes")}</h4>
              <p>{row.clientNotes || t("noNotesSubmitted")}</p>
            </div>
            <form action={formAction} className="client-edit-form">
              <input type="hidden" name="id" value={row.id} />
              <div className="form-grid">
                <label className="full"><span>{t("coachFeedback")}</span><textarea name="coach_feedback" rows={4} maxLength={4000} defaultValue={row.coachFeedback} placeholder={t("feedbackPlaceholder")} /></label>
              </div>
              {state.error ? <p className="form-message error" role="alert">{state.error}</p> : null}
              <div className="form-submit">
                <span>{t("clientSeesFeedbackHint")}</span>
                <button className="button primary" type="submit" disabled={pending}>{pending ? tc("saving") : t("saveFeedback")}</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}

function ClientCheckInGroup({ client, rows, history, period }: { client: string; rows: CheckInRow[]; history: CheckInRow[]; period: Period }) {
  const t = useTranslations("CheckIns");
  const ts = useTranslations("Common.status");
  const [active, setActive] = useState<CheckInRow | null>(null);
  const periods = useMemo(() => aggregate(rows, period), [rows, period]);
  const latest = rows[0];
  // Compare against the nearest earlier photo, including rows hidden by filters.
  const previousRow = active
    ? history.slice(history.findIndex((row) => row.id === active.id) + 1).find((row) => hasAnyProgressPhoto(row.progressPhotos)) || null
    : null;

  return (
    <details className="card checkin-group">
      <summary className="checkin-group-head">
        <div>
          <span className="eyebrow">{t("checkInsCount", { count: rows.length })}</span>
          <h2>{client}</h2>
        </div>
        {latest ? (
          <div className="plan-metrics">
            <div><strong>{latest.weightKg ?? "—"}</strong><span>{t("latestKg")}</span></div>
            <div><strong>{latest.dietPct}%</strong><span>{t("diet")}</span></div>
            <div><strong>{latest.workoutPct}%</strong><span>{t("workout")}</span></div>
          </div>
        ) : null}
        <ChevronDown size={20} className="checkin-group-chevron" aria-hidden="true" />
      </summary>
      <div className="checkin-group-body">
        <Link href={`/coach/clients?client=${latest.clientId}`} className="checkin-group-client-link">
          {t("viewFullProfile")} <ExternalLink size={14} aria-hidden="true" />
        </Link>
      {period !== "week" ? <div className="checkin-period-rows">
        {periods.map((entry) => (
          <div className="checkin-period-row" key={entry.key}>
            <span>{entry.label}</span>
            <span>{entry.avgDiet}% {t("diet")}</span>
            <span>{entry.avgWorkout}% {t("workout")}</span>
            <span>{entry.weight != null ? `${entry.weight} kg` : "—"}</span>
            <span className="muted">{t("submissionsCount", { count: entry.count })}</span>
          </div>
        ))}
      </div> : null}
      {period === "week" ? (
        <div className="data-table-wrap">
          <table className="data-table">
            <thead><tr><th>{t("colWeek")}</th><th>{t("colWeight")}</th><th>{t("colDiet")}</th><th>{t("colWorkout")}</th><th>{t("colStatus")}</th></tr></thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="is-clickable" onClick={() => setActive(row)}>
                  <td>
                    <button type="button" className="text-button" onClick={(event) => { event.stopPropagation(); setActive(row); }}>
                      {weekLabel.format(new Date(`${row.weekOf}T00:00:00`))}
                    </button>
                    {hasAnyProgressPhoto(row.progressPhotos) ? <Camera size={12} className="checkin-row-photo-flag" aria-label={t("hasPhotosFlag")} /> : null}
                  </td>
                  <td>{row.weightKg != null ? `${row.weightKg} kg` : "-"}</td>
                  <td>{row.dietPct}%</td>
                  <td>{row.workoutPct}%</td>
                  <td><Badge tone={tone(row.status)}>{statusLabel(ts, row.status)}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
      </div>
      {active ? <CheckInDetail row={active} previousRow={previousRow} onClose={() => setActive(null)} /> : null}
    </details>
  );
}

export function CoachCheckInsWorkspace({ checkIns }: { checkIns: CheckInRow[] }) {
  const t = useTranslations("CheckIns");
  const ts = useTranslations("Common.status");
  const [period, setPeriod] = useState<Period>("week");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [month, setMonth] = useState("");

  const groups = useMemo(() => {
    const map = new Map<number, { client: string; rows: CheckInRow[] }>();
    for (const row of checkIns) {
      const entry = map.get(row.clientId) || { client: row.client, rows: [] };
      entry.rows.push(row);
      map.set(row.clientId, entry);
    }
    for (const entry of map.values()) entry.rows.sort((a, b) => (a.weekOf < b.weekOf ? 1 : -1));
    return Array.from(map.values()).sort((a, b) => (b.rows[0]?.weekOf || "").localeCompare(a.rows[0]?.weekOf || ""));
  }, [checkIns]);
  const filteredGroups = groups.map((group) => ({ ...group, history: group.rows, rows: filterCheckIns(group.rows, { search, status, month }) })).filter((group) => group.rows.length > 0);
  const months = Array.from(new Set(checkIns.map((row) => row.weekOf.slice(0, 7)))).sort().reverse();
  const hasFilters = Boolean(search || status || month);

  if (checkIns.length === 0) {
    return (
      <Card className="empty-state">
        <ClipboardCheck size={24} />
        <h3>{t("noCheckInsTitle")}</h3>
        <p>{t("noCheckInsHint")}</p>
      </Card>
    );
  }

  return (
    <>
      <div className="checkin-toolbar">
      <div className="status-toggle checkin-period-toggle" role="group" aria-label={t("aggregateByAria")}>
        {(["week", "month", "year"] as Period[]).map((option) => (
          <button key={option} type="button" aria-pressed={period === option} className={period === option ? "active" : ""} onClick={() => setPeriod(option)}>
            {option === "week" ? t("byWeek") : option === "month" ? t("byMonth") : t("byYear")}
          </button>
        ))}
      </div>
      <div className="checkin-filters">
        <label className="inline-search">
          <Search size={16} aria-hidden="true" />
          <input type="search" aria-label={t("searchClients")} placeholder={t("searchClients")} value={search} onChange={(event) => setSearch(event.target.value)} />
        </label>
        <select aria-label={t("filterStatus")} value={status} onChange={(event) => setStatus(event.target.value)}>
          <option value="">{t("allStatuses")}</option>
          {(["pending", "submitted", "reviewed"] as const).map((value) => <option key={value} value={value}>{statusLabel(ts, value)}</option>)}
        </select>
        <select aria-label={t("filterMonth")} value={month} onChange={(event) => setMonth(event.target.value)}>
          <option value="">{t("allMonths")}</option>
          {months.map((value) => <option key={value} value={value}>{periodLabel(value, "month")}</option>)}
        </select>
        {hasFilters ? <button type="button" className="text-button" onClick={() => { setSearch(""); setStatus(""); setMonth(""); }}>{t("clearFilters")}</button> : null}
      </div>
      </div>
      <div className="checkin-group-stack">
        {filteredGroups.map((group) => <ClientCheckInGroup key={group.rows[0].clientId} client={group.client} rows={group.rows} history={group.history} period={period} />)}
        {filteredGroups.length === 0 ? <Card className="empty-state"><ClipboardCheck size={24} /><h3 role="status">{t("noMatchingCheckIns")}</h3><p>{t("adjustFilters")}</p></Card> : null}
      </div>
    </>
  );
}
