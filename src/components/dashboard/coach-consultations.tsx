"use client";

import { CalendarPlus, X } from "lucide-react";
import { useActionState, useState } from "react";
import { bookConsultationAction, updateConsultationStatusAction, type ConsultationActionState } from "@/app/actions/consultations";
import { ModalPortal } from "./modal-portal";
import { Badge, Card } from "./primitives";

const initialActionState: ConsultationActionState = {};

export type ConsultationRow = {
  id: number;
  client: string;
  startsAt: string;
  durationMinutes: number;
  status: "scheduled" | "completed" | "cancelled" | "no_show";
  notes: string;
};

export type ConsultationClientOption = { id: number; name: string; status: string };

function tone(status: string): "success" | "warning" | "danger" | "neutral" {
  if (status === "completed") return "success";
  if (status === "cancelled" || status === "no_show") return "danger";
  if (status === "scheduled") return "warning";
  return "neutral";
}

const dateTime = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });

export function BookConsultationButton({ clients }: { clients: ConsultationClientOption[] }) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(async (previous: ConsultationActionState, formData: FormData) => {
    const result = await bookConsultationAction(previous, formData);
    if (result.success) setOpen(false);
    return result;
  }, initialActionState);

  return (
    <>
      <button className="button primary" type="button" onClick={() => setOpen(true)}>
        <CalendarPlus size={15} /> Book consultation
      </button>
      {open ? (
        <ModalPortal>
          <div className="plan-modal-backdrop" role="presentation" onMouseDown={() => setOpen(false)}>
            <div className="plan-modal" role="dialog" aria-modal="true" aria-label="Book a consultation" onMouseDown={(event) => event.stopPropagation()}>
              <button className="modal-close icon-button" type="button" aria-label="Close" onClick={() => setOpen(false)}><X size={18} /></button>
              <section className="builder-panel">
                <header>
                  <span className="eyebrow">Consultations</span>
                  <h2>Book a consultation</h2>
                  <p>Schedule an intake call or assessment with a client.</p>
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
                    <label><span>Date &amp; time</span><input name="starts_at" type="datetime-local" required /></label>
                    <label><span>Duration (minutes)</span><input name="duration_minutes" type="number" min={15} max={240} step={5} defaultValue={45} required /></label>
                    <label className="full"><span>Notes (optional)</span><textarea name="notes" rows={3} maxLength={2000} placeholder="What should this consultation cover?" /></label>
                  </div>
                  {state.error ? <p className="form-message error" role="alert">{state.error}</p> : null}
                  <div className="form-submit">
                    <span>The client isn&rsquo;t notified automatically yet — let them know directly.</span>
                    <button className="button primary" type="submit" disabled={pending}>{pending ? "Booking..." : "Book consultation"}</button>
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

const statusLabels: Record<ConsultationRow["status"], string> = {
  scheduled: "Mark scheduled",
  completed: "Mark completed",
  no_show: "No-show",
  cancelled: "Cancel",
};

function ConsultationStatusActions({ consultation }: { consultation: ConsultationRow }) {
  const [state, formAction, pending] = useActionState(updateConsultationStatusAction, initialActionState);
  const otherStatuses = (Object.keys(statusLabels) as ConsultationRow["status"][]).filter((status) => status !== consultation.status);
  return (
    <form action={formAction} className="consultation-status-actions">
      <input type="hidden" name="id" value={consultation.id} />
      {otherStatuses.map((status) => (
        <button
          key={status}
          className={`text-button${status === "cancelled" ? " danger-text" : ""}`}
          type="submit"
          name="status"
          value={status}
          disabled={pending}
        >
          {statusLabels[status]}
        </button>
      ))}
      {state.error ? <span className="form-message error">{state.error}</span> : null}
    </form>
  );
}

export function CoachConsultationsWorkspace({ consultations }: { consultations: ConsultationRow[] }) {
  return (
    <>
      {consultations.length === 0 ? (
        <Card className="empty-state">
          <CalendarPlus size={24} />
          <h3>No consultations yet</h3>
          <p>Book your first intake call or assessment to get started.</p>
        </Card>
      ) : (
        <Card>
          <div className="data-table-wrap">
            <table className="data-table">
              <thead><tr><th>Client</th><th>Starts</th><th>Minutes</th><th>Status</th><th>Notes</th><th></th></tr></thead>
              <tbody>
                {consultations.map((row) => (
                  <tr key={row.id}>
                    <td>{row.client}</td>
                    <td>{dateTime.format(new Date(row.startsAt))}</td>
                    <td>{row.durationMinutes}</td>
                    <td><Badge tone={tone(row.status)}>{row.status.replace("_", " ")}</Badge></td>
                    <td>{row.notes || "-"}</td>
                    <td><ConsultationStatusActions consultation={row} /></td>
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
