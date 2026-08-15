"use client";

import { Activity, X } from "lucide-react";
import { useActionState, useState } from "react";
import { bookSessionAction, updateSessionAttendanceAction, type SessionActionState } from "@/app/actions/sessions";
import { ModalPortal } from "./modal-portal";
import { Badge, Card } from "./primitives";

const initialActionState: SessionActionState = {};

export type SessionRow = {
  id: number;
  client: string;
  service: string;
  startsAt: string;
  durationMinutes: number;
  attendance: "scheduled" | "attended" | "cancelled" | "no_show";
  notes: string;
};

export type SessionClientOption = { id: number; name: string; status: string };
export type SessionServiceOption = { id: number; name: string; tier: string | null };

function tone(status: string): "success" | "warning" | "danger" | "neutral" {
  if (status === "attended") return "success";
  if (status === "cancelled" || status === "no_show") return "danger";
  if (status === "scheduled") return "warning";
  return "neutral";
}

const dateTime = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });

export function BookSessionButton({ clients, services }: { clients: SessionClientOption[]; services: SessionServiceOption[] }) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(async (previous: SessionActionState, formData: FormData) => {
    const result = await bookSessionAction(previous, formData);
    if (result.success) setOpen(false);
    return result;
  }, initialActionState);

  return (
    <>
      <button className="button primary" type="button" onClick={() => setOpen(true)}>
        <Activity size={15} /> Log session
      </button>
      {open ? (
        <ModalPortal>
          <div className="plan-modal-backdrop" role="presentation" onMouseDown={() => setOpen(false)}>
            <div className="plan-modal" role="dialog" aria-modal="true" aria-label="Log a personal training session" onMouseDown={(event) => event.stopPropagation()}>
              <button className="modal-close icon-button" type="button" aria-label="Close" onClick={() => setOpen(false)}><X size={18} /></button>
              <section className="builder-panel">
                <header>
                  <span className="eyebrow">Personal training</span>
                  <h2>Log a session</h2>
                  <p>Book or record a 1:1 training session with a client.</p>
                </header>
                <form action={formAction} className="client-edit-form">
                  <div className="form-grid">
                    <label className="full">
                      <span>Client</span>
                      <select name="client_id" required defaultValue="">
                        <option value="" disabled>Choose a client</option>
                        {clients.map((client) => <option key={client.id} value={client.id}>{client.name} — {client.status}</option>)}
                      </select>
                    </label>
                    <label className="full">
                      <span>Tier (optional)</span>
                      <select name="service_id" defaultValue="">
                        <option value="">No specific tier</option>
                        {services.map((service) => <option key={service.id} value={service.id}>{service.name}{service.tier ? ` (${service.tier})` : ""}</option>)}
                      </select>
                    </label>
                    <label><span>Date &amp; time</span><input name="starts_at" type="datetime-local" required /></label>
                    <label><span>Duration (minutes)</span><input name="duration_minutes" type="number" min={15} max={240} step={5} defaultValue={60} required /></label>
                    <label className="full"><span>Notes (optional)</span><textarea name="notes" rows={3} maxLength={2000} placeholder="Focus areas, cues, progression notes..." /></label>
                  </div>
                  {state.error ? <p className="form-message error" role="alert">{state.error}</p> : null}
                  <div className="form-submit">
                    <span>The client isn&rsquo;t notified automatically yet — let them know directly.</span>
                    <button className="button primary" type="submit" disabled={pending}>{pending ? "Booking..." : "Log session"}</button>
                  </div>
                </form>
              </section>
            </div>
          </div>
        </ModalPortal>
      ) : null}
    </>
  );
}

const attendanceLabels: Record<SessionRow["attendance"], string> = {
  scheduled: "Mark scheduled",
  attended: "Mark attended",
  no_show: "No-show",
  cancelled: "Cancel",
};

function SessionAttendanceActions({ session }: { session: SessionRow }) {
  const [state, formAction, pending] = useActionState(updateSessionAttendanceAction, initialActionState);
  const otherStatuses = (Object.keys(attendanceLabels) as SessionRow["attendance"][]).filter((status) => status !== session.attendance);
  return (
    <form action={formAction} className="consultation-status-actions">
      <input type="hidden" name="id" value={session.id} />
      {otherStatuses.map((status) => (
        <button
          key={status}
          className={`text-button${status === "cancelled" ? " danger-text" : ""}`}
          type="submit"
          name="attendance"
          value={status}
          disabled={pending}
        >
          {attendanceLabels[status]}
        </button>
      ))}
      {state.error ? <span className="form-message error">{state.error}</span> : null}
    </form>
  );
}

export function CoachPersonalTrainingWorkspace({ sessions }: { sessions: SessionRow[] }) {
  return (
    <>
      {sessions.length === 0 ? (
        <Card className="empty-state">
          <Activity size={24} />
          <h3>No sessions yet</h3>
          <p>Log your first personal training session to get started.</p>
        </Card>
      ) : (
        <Card>
          <div className="data-table-wrap">
            <table className="data-table">
              <thead><tr><th>Client</th><th>Tier</th><th>Starts</th><th>Minutes</th><th>Attendance</th><th>Notes</th><th></th></tr></thead>
              <tbody>
                {sessions.map((row) => (
                  <tr key={row.id}>
                    <td>{row.client}</td>
                    <td>{row.service}</td>
                    <td>{dateTime.format(new Date(row.startsAt))}</td>
                    <td>{row.durationMinutes}</td>
                    <td><Badge tone={tone(row.attendance)}>{row.attendance.replace("_", " ")}</Badge></td>
                    <td>{row.notes || "-"}</td>
                    <td><SessionAttendanceActions session={row} /></td>
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
