"use client";

import { Activity, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useActionState, useState } from "react";
import { bookSessionAction, updateSessionAttendanceAction, type SessionActionState } from "@/app/actions/sessions";
import { statusLabel } from "@/lib/status-labels";
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
  const t = useTranslations("PersonalTraining");
  const tc = useTranslations("Common");
  const ts = useTranslations("Common.status");
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(async (previous: SessionActionState, formData: FormData) => {
    const result = await bookSessionAction(previous, formData);
    if (result.success) setOpen(false);
    return result;
  }, initialActionState);

  return (
    <>
      <button className="button primary" type="button" onClick={() => setOpen(true)}>
        <Activity size={15} /> {t("logSession")}
      </button>
      {open ? (
        <ModalPortal>
          <div className="plan-modal-backdrop" role="presentation" onMouseDown={() => setOpen(false)}>
            <div className="plan-modal" role="dialog" aria-modal="true" aria-label={t("modalAria")} onMouseDown={(event) => event.stopPropagation()}>
              <button className="modal-close icon-button" type="button" aria-label={tc("close")} onClick={() => setOpen(false)}><X size={18} /></button>
              <section className="builder-panel">
                <header>
                  <span className="eyebrow">{t("modalEyebrow")}</span>
                  <h2>{t("modalTitle")}</h2>
                  <p>{t("modalHint")}</p>
                </header>
                <form action={formAction} className="client-edit-form">
                  <div className="form-grid">
                    <label className="full">
                      <span>{t("client")}</span>
                      <select name="client_id" required defaultValue="">
                        <option value="" disabled>{t("chooseAClient")}</option>
                        {clients.map((client) => <option key={client.id} value={client.id}>{client.name} — {statusLabel(ts, client.status)}</option>)}
                      </select>
                    </label>
                    <label className="full">
                      <span>{t("tierOptional")}</span>
                      <select name="service_id" defaultValue="">
                        <option value="">{t("noSpecificTier")}</option>
                        {services.map((service) => <option key={service.id} value={service.id}>{service.name}{service.tier ? ` (${service.tier})` : ""}</option>)}
                      </select>
                    </label>
                    <label><span>{t("dateTime")}</span><input name="starts_at" type="datetime-local" required /></label>
                    <label><span>{t("durationMinutes")}</span><input name="duration_minutes" type="number" min={15} max={240} step={5} defaultValue={60} required /></label>
                    <label className="full"><span>{t("notesOptional")}</span><textarea name="notes" rows={3} maxLength={2000} placeholder={t("notesPlaceholder")} /></label>
                  </div>
                  {state.error ? <p className="form-message error" role="alert">{state.error}</p> : null}
                  <div className="form-submit">
                    <span>{t("notNotifiedHint")}</span>
                    <button className="button primary" type="submit" disabled={pending}>{pending ? tc("booking") : t("logSession")}</button>
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

function SessionAttendanceActions({ session }: { session: SessionRow }) {
  const t = useTranslations("PersonalTraining");
  const [state, formAction, pending] = useActionState(updateSessionAttendanceAction, initialActionState);
  const attendanceLabels: Record<SessionRow["attendance"], string> = {
    scheduled: t("markScheduled"),
    attended: t("markAttended"),
    no_show: t("noShow"),
    cancelled: t("cancel"),
  };
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
  const t = useTranslations("PersonalTraining");
  const ts = useTranslations("Common.status");
  return (
    <>
      {sessions.length === 0 ? (
        <Card className="empty-state">
          <Activity size={24} />
          <h3>{t("noSessionsTitle")}</h3>
          <p>{t("noSessionsHint")}</p>
        </Card>
      ) : (
        <Card>
          <div className="data-table-wrap">
            <table className="data-table">
              <thead><tr><th>{t("colClient")}</th><th>{t("colTier")}</th><th>{t("colStarts")}</th><th>{t("colMinutes")}</th><th>{t("colAttendance")}</th><th>{t("colNotes")}</th><th></th></tr></thead>
              <tbody>
                {sessions.map((row) => (
                  <tr key={row.id}>
                    <td>{row.client}</td>
                    <td>{row.service}</td>
                    <td>{dateTime.format(new Date(row.startsAt))}</td>
                    <td>{row.durationMinutes}</td>
                    <td><Badge tone={tone(row.attendance)}>{statusLabel(ts, row.attendance)}</Badge></td>
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
