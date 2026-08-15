"use client";

import { ClipboardCheck, X } from "lucide-react";
import { useActionState, useMemo, useState } from "react";
import { reviewCheckInAction, type CheckInActionState } from "@/app/actions/check-ins";
import { ModalPortal } from "./modal-portal";
import { Badge, Card } from "./primitives";

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

function CheckInDetail({ row, onClose }: { row: CheckInRow; onClose: () => void }) {
  const [state, formAction, pending] = useActionState(async (previous: CheckInActionState, formData: FormData) => {
    const result = await reviewCheckInAction(previous, formData);
    if (result.success) onClose();
    return result;
  }, initialActionState);

  return (
    <ModalPortal>
      <div className="plan-modal-backdrop" role="presentation" onMouseDown={onClose}>
        <div className="plan-modal detail-modal" role="dialog" aria-modal="true" aria-label={`${row.client} check-in`} onMouseDown={(event) => event.stopPropagation()}>
          <button className="modal-close icon-button" type="button" aria-label="Close" onClick={onClose}><X size={18} /></button>
          <div className="detail-panel">
            <div className="detail-head">
              <span className="eyebrow">{weekLabel.format(new Date(`${row.weekOf}T00:00:00`))}</span>
              <h2>{row.client}</h2>
              <Badge tone={tone(row.status)}>{row.status}</Badge>
            </div>
            <div className="detail-metrics">
              <div><strong>{row.weightKg ?? "—"}</strong><span>weight kg</span></div>
              <div><strong>{row.dietPct}%</strong><span>diet</span></div>
              <div><strong>{row.workoutPct}%</strong><span>workout</span></div>
              <div><strong>{row.energy ?? "—"}</strong><span>energy</span></div>
            </div>
            <div className="detail-instructions">
              <h4>Client notes</h4>
              <p>{row.clientNotes || "No notes submitted this week."}</p>
            </div>
            <form action={formAction} className="client-edit-form">
              <input type="hidden" name="id" value={row.id} />
              <div className="form-grid">
                <label className="full"><span>Coach feedback</span><textarea name="coach_feedback" rows={4} maxLength={4000} defaultValue={row.coachFeedback} placeholder="Encouragement, adjustments, or next steps for the client." /></label>
              </div>
              {state.error ? <p className="form-message error" role="alert">{state.error}</p> : null}
              <div className="form-submit">
                <span>The client sees this feedback on their check-in.</span>
                <button className="button primary" type="submit" disabled={pending}>{pending ? "Saving..." : "Save feedback"}</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}

function ClientCheckInGroup({ client, rows, period }: { client: string; rows: CheckInRow[]; period: Period }) {
  const [active, setActive] = useState<CheckInRow | null>(null);
  const periods = useMemo(() => aggregate(rows, period), [rows, period]);
  const latest = rows[0];

  return (
    <Card className="checkin-group">
      <div className="checkin-group-head">
        <div>
          <span className="eyebrow">{rows.length} check-in{rows.length === 1 ? "" : "s"}</span>
          <h2>{client}</h2>
        </div>
        {latest ? (
          <div className="plan-metrics">
            <div><strong>{latest.weightKg ?? "—"}</strong><span>latest kg</span></div>
            <div><strong>{latest.dietPct}%</strong><span>diet</span></div>
            <div><strong>{latest.workoutPct}%</strong><span>workout</span></div>
          </div>
        ) : null}
      </div>
      <div className="checkin-period-rows">
        {periods.map((entry) => (
          <div className="checkin-period-row" key={entry.key}>
            <span>{entry.label}</span>
            <span>{entry.avgDiet}% diet</span>
            <span>{entry.avgWorkout}% workout</span>
            <span>{entry.weight != null ? `${entry.weight} kg` : "—"}</span>
            {period !== "week" ? <span className="muted">{entry.count} submission{entry.count === 1 ? "" : "s"}</span> : null}
          </div>
        ))}
      </div>
      {period === "week" ? (
        <div className="data-table-wrap">
          <table className="data-table">
            <thead><tr><th>Week</th><th>Weight</th><th>Diet</th><th>Workout</th><th>Status</th></tr></thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="is-clickable" onClick={() => setActive(row)}>
                  <td>{weekLabel.format(new Date(`${row.weekOf}T00:00:00`))}</td>
                  <td>{row.weightKg != null ? `${row.weightKg} kg` : "-"}</td>
                  <td>{row.dietPct}%</td>
                  <td>{row.workoutPct}%</td>
                  <td><Badge tone={tone(row.status)}>{row.status}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
      {active ? <CheckInDetail row={active} onClose={() => setActive(null)} /> : null}
    </Card>
  );
}

export function CoachCheckInsWorkspace({ checkIns }: { checkIns: CheckInRow[] }) {
  const [period, setPeriod] = useState<Period>("week");

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

  if (checkIns.length === 0) {
    return (
      <Card className="empty-state">
        <ClipboardCheck size={24} />
        <h3>No check-ins yet</h3>
        <p>Weekly submissions from clients will appear here.</p>
      </Card>
    );
  }

  return (
    <>
      <div className="status-toggle checkin-period-toggle" role="group" aria-label="Aggregate by">
        {(["week", "month", "year"] as Period[]).map((option) => (
          <button key={option} type="button" className={period === option ? "active" : ""} onClick={() => setPeriod(option)}>
            {option === "week" ? "By week" : option === "month" ? "By month" : "By year"}
          </button>
        ))}
      </div>
      <div className="checkin-group-stack">
        {groups.map((group) => <ClientCheckInGroup key={group.rows[0]?.clientId ?? group.client} client={group.client} rows={group.rows} period={period} />)}
      </div>
    </>
  );
}
