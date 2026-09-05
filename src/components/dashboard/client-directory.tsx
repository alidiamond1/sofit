"use client";

import {
  AlertTriangle,
  CheckCircle2,
  CircleDashed,
  Pencil,
  RefreshCw,
  Search,
  Trash2,
  UserRoundCheck,
  UsersRound,
  X,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useActionState, useDeferredValue, useMemo, useState } from "react";
import { deleteClientAction, updateClientAction, type ClientActionState } from "@/app/actions/clients";
import { statusLabel } from "@/lib/status-labels";
import { ModalPortal } from "./modal-portal";
import { Avatar, Badge, ProgressBar } from "./primitives";

export type ClientDirectoryRow = {
  id: number;
  name: string;
  email: string;
  avatarPath: string | null;
  phone: string;
  dateOfBirth: string;
  goals: string;
  medicalNotes: string;
  status: string;
  pipelineStage: string;
  joined: string;
  serviceId: number | null;
  packageId: number | null;
  service: string | null;
  packageName: string | null;
  packageCategory: string | null;
  adherence: number;
};

export type ClientServiceOption = { id: number; name: string; isActive: boolean };
export type ClientPackageOption = { id: number; name: string; category: string; isActive: boolean };

const stages = [
  { key: "all", labelKey: "stageAll", icon: UsersRound },
  { key: "lead", labelKey: "stageLead", icon: CircleDashed },
  { key: "onboarding", labelKey: "stageOnboarding", icon: RefreshCw },
  { key: "active", labelKey: "stageActive", icon: UserRoundCheck },
  { key: "renewal", labelKey: "stageRenewal", icon: CheckCircle2 },
] as const;

function badgeTone(status: string): "success" | "warning" | "danger" | "neutral" {
  if (status === "active") return "success";
  if (status === "paused" || status === "onboarding") return "warning";
  if (status === "churned") return "danger";
  return "neutral";
}

const initialActionState: ClientActionState = {};

function ClientRecordActions({
  client,
  services,
  packages,
}: {
  client: ClientDirectoryRow;
  services: ClientServiceOption[];
  packages: ClientPackageOption[];
}) {
  const t = useTranslations("Clients");
  const tc = useTranslations("Common");
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [editState, editAction, editPending] = useActionState(async (previous: ClientActionState, formData: FormData) => {
    const result = await updateClientAction(previous, formData);
    if (result.success) setEditing(false);
    return result;
  }, initialActionState);
  const [deleteState, deleteAction, deletePending] = useActionState(async (previous: ClientActionState, formData: FormData) => {
    const result = await deleteClientAction(previous, formData);
    if (result.success) setDeleting(false);
    return result;
  }, initialActionState);
  const inactiveSuffix = t("inactiveSuffix");

  return (
    <>
      <div className="record-actions management-action-cluster client-row-actions" aria-label={t("manageAria", { name: client.name })}>
        <button className="management-icon-button" type="button" title={t("editTitle")} aria-label={t("editAria", { name: client.name })} onClick={() => setEditing(true)}><Pencil size={14} /><span>{tc("edit")}</span></button>
        <button className="management-icon-button danger-action" type="button" title={t("deleteTitle")} aria-label={t("deleteAria", { name: client.name })} onClick={() => setDeleting(true)}><Trash2 size={14} /><span className="sr-only">{tc("delete")}</span></button>
      </div>

      {editing ? (
        <ModalPortal><div className="plan-modal-backdrop" role="presentation" onMouseDown={() => setEditing(false)}>
          <div className="plan-modal wide" role="dialog" aria-modal="true" aria-label={t("editAria", { name: client.name })} onMouseDown={(event) => event.stopPropagation()}>
            <button className="modal-close icon-button" type="button" aria-label={tc("close")} onClick={() => setEditing(false)}><X size={18} /></button>
            <section className="builder-panel client-modal-panel">
              <header><span className="eyebrow">{t("editModalEyebrow")}</span><h2>{t("editModalTitle", { name: client.name })}</h2><p>{t("editModalDescription")}</p></header>
              <form action={editAction} className="client-edit-form">
                <input type="hidden" name="id" value={client.id} />
                <div className="form-grid">
                  <label><span>{t("fullName")}</span><input name="name" defaultValue={client.name} required minLength={2} maxLength={120} /></label>
                  <label><span>{t("emailAddress")}</span><input name="email" type="email" defaultValue={client.email} required maxLength={190} /></label>
                  <label><span>{t("phoneNumber")}</span><input name="phone" defaultValue={client.phone} maxLength={40} placeholder={t("phonePlaceholder")} /></label>
                  <label><span>{t("dateOfBirth")}</span><input name="date_of_birth" type="date" defaultValue={client.dateOfBirth} /></label>
                  <label><span>{t("accountStatus")}</span><select name="status" defaultValue={client.status}><option value="active">{tc("status.active")}</option><option value="paused">{tc("status.paused")}</option><option value="churned">{tc("status.churned")}</option></select></label>
                  <label><span>{t("pipelineStage")}</span><select name="pipeline_stage" defaultValue={client.pipelineStage}><option value="lead">{t("stageLead")}</option><option value="onboarding">{t("stageOnboarding")}</option><option value="active">{t("stageActive")}</option><option value="renewal">{t("stageRenewal")}</option></select></label>
                  <label><span>{t("primaryService")}</span><select name="service_id" defaultValue={client.serviceId ?? ""}><option value="">{t("noServiceOption")}</option>{services.map((service) => <option key={service.id} value={service.id}>{service.name}{service.isActive ? "" : inactiveSuffix}</option>)}</select></label>
                  <label><span>{t("package")}</span><select name="package_id" defaultValue={client.packageId ?? ""}><option value="">{t("noPackageOption")}</option>{packages.map((item) => <option key={item.id} value={item.id}>{item.name} - {item.category}{item.isActive ? "" : inactiveSuffix}</option>)}</select></label>
                  <label className="full"><span>{t("goals")}</span><textarea name="goals" rows={3} maxLength={5000} defaultValue={client.goals} placeholder={t("goalsPlaceholder")} /></label>
                  <label className="full"><span>{t("medicalNotes")}</span><textarea name="medical_notes" rows={3} maxLength={5000} defaultValue={client.medicalNotes} placeholder={t("medicalNotesPlaceholder")} /></label>
                </div>
                {editState.error ? <p className="form-message error" role="alert">{editState.error}</p> : null}
                <div className="form-submit"><span>{t("changesAppearImmediately")}</span><button className="button primary" type="submit" disabled={editPending}>{editPending ? tc("saving") : t("saveClient")}</button></div>
              </form>
            </section>
          </div>
        </div></ModalPortal>
      ) : null}

      {deleting ? (
        <ModalPortal><div className="plan-modal-backdrop" role="presentation" onMouseDown={() => setDeleting(false)}>
          <div className="plan-modal confirm-modal" role="alertdialog" aria-modal="true" aria-label={t("deleteAria", { name: client.name })} onMouseDown={(event) => event.stopPropagation()}>
            <button className="modal-close icon-button" type="button" aria-label={tc("close")} onClick={() => setDeleting(false)}><X size={18} /></button>
            <section className="builder-panel destructive-panel">
              <span className="destructive-icon"><AlertTriangle size={22} /></span>
              <span className="eyebrow">{t("areYouSure")}</span>
              <h2>{t("deleteConfirmTitle", { name: client.name })}</h2>
              <p>{t("deleteConfirmBody")}</p>
              <form action={deleteAction}>
                <input type="hidden" name="id" value={client.id} />
                {deleteState.error ? <p className="form-message error" role="alert">{deleteState.error}</p> : null}
                <div className="confirm-actions"><button className="button secondary" type="button" onClick={() => setDeleting(false)}>{tc("cancel")}</button><button className="button danger" type="submit" disabled={deletePending}>{deletePending ? tc("deleting") : t("yesDeleteClient")}</button></div>
              </form>
            </section>
          </div>
        </div></ModalPortal>
      ) : null}
    </>
  );
}

export function ClientDirectory({ clients, services, packages }: { clients: ClientDirectoryRow[]; services: ClientServiceOption[]; packages: ClientPackageOption[] }) {
  const t = useTranslations("Clients");
  const ts = useTranslations("Common.status");
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [stage, setStage] = useState("all");
  const [status, setStatus] = useState("all");
  const deferredQuery = useDeferredValue(query.trim().toLowerCase());

  const counts = useMemo(() => {
    const result = new Map<string, number>([["all", clients.length]]);
    for (const client of clients) result.set(client.pipelineStage, (result.get(client.pipelineStage) || 0) + 1);
    return result;
  }, [clients]);

  const filtered = useMemo(() => clients.filter((client) => {
    const matchesStage = stage === "all" || client.pipelineStage === stage;
    const matchesStatus = status === "all" || client.status === status;
    const haystack = [client.name, client.email, client.service, client.packageName, client.packageCategory]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return matchesStage && matchesStatus && (!deferredQuery || haystack.includes(deferredQuery));
  }), [clients, deferredQuery, stage, status]);

  const hasFilters = Boolean(query || stage !== "all" || status !== "all");

  function resetFilters() {
    setQuery("");
    setStage("all");
    setStatus("all");
  }

  return (
    <div className="client-management">
      <section className="client-pipeline" aria-labelledby="client-pipeline-title">
        <div className="client-pipeline-heading">
          <div>
            <span className="eyebrow">{t("livePipeline")}</span>
            <h2 id="client-pipeline-title">{t("clientJourney")}</h2>
          </div>
          <p>{t("selectStageHint")}</p>
        </div>
        <div className="client-pipeline-steps">
          {stages.map((item, index) => {
            const Icon = item.icon;
            const selected = stage === item.key;
            return (
              <button
                className={`client-pipeline-step${selected ? " selected" : ""}`}
                key={item.key}
                type="button"
                onClick={() => setStage(item.key)}
                aria-pressed={selected}
              >
                <span className="client-step-icon"><Icon size={17} /></span>
                <span className="client-step-copy"><strong>{t(item.labelKey)}</strong><small>{t("clientsCount", { count: counts.get(item.key) || 0 })}</small></span>
                {index > 0 ? <span className="client-step-index">0{index}</span> : null}
              </button>
            );
          })}
        </div>
      </section>

      <section className="client-directory-card" aria-labelledby="client-directory-title">
        <div className="client-directory-heading">
          <div>
            <span className="eyebrow">{t("clientRoster")}</span>
            <h2 id="client-directory-title">{t("clientDirectory")}</h2>
            <p>{t("shownCount", { shown: filtered.length, total: clients.length })}</p>
          </div>
          <div className="client-directory-controls">
            <label className="client-search">
              <Search size={17} />
              <span className="sr-only">{t("searchLabel")}</span>
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t("searchPlaceholder")} />
            </label>
            <label className="client-status-filter">
              <span className="sr-only">{t("filterByStatusLabel")}</span>
              <select value={status} onChange={(event) => setStatus(event.target.value)}>
                <option value="all">{t("allStatuses")}</option>
                <option value="active">{ts("active")}</option>
                <option value="paused">{ts("paused")}</option>
                <option value="churned">{ts("churned")}</option>
              </select>
            </label>
            {hasFilters ? <button className="client-clear-filter" type="button" onClick={resetFilters}>{t("clear")}</button> : null}
          </div>
        </div>

        <div className="client-list-head" aria-hidden="true">
          <span>{t("colClient")}</span><span>{t("colProgram")}</span><span>{t("colJourney")}</span><span>{t("colAdherence")}</span><span>{t("colJoined")}</span><span><span className="sr-only">{t("colActions")}</span></span>
        </div>
        <div className="client-records">
          {filtered.map((client, index) => (
            <article
              className="client-record client-record-clickable"
              key={client.id}
              role="button"
              tabIndex={0}
              onClick={() => router.push(`/coach/clients?client=${client.id}`)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  router.push(`/coach/clients?client=${client.id}`);
                }
              }}
              aria-label={t("viewDetailAria", { name: client.name })}
            >
              <div className="client-record-person">
                <Avatar name={client.name} tone={index} src={client.avatarPath} />
                <div><strong>{client.name}</strong><span>{client.email}</span></div>
              </div>
              <div className="client-record-program" data-label={t("colProgram")}>
                <strong>{client.packageName || t("noPackageAssigned")}</strong>
                <span>{client.service || t("serviceNotAssigned")}</span>
              </div>
              <div className="client-record-journey" data-label={t("colJourney")}>
                <Badge tone={badgeTone(client.status)}>{statusLabel(ts, client.status)}</Badge>
                <span className="client-stage-dot"><i />{statusLabel(ts, client.pipelineStage)}</span>
              </div>
              <div className="client-record-adherence" data-label={t("colAdherence")}>
                <ProgressBar value={client.adherence} />
              </div>
              <div className="client-record-joined" data-label={t("colJoined")}><strong>{client.joined}</strong><span>{t("clientSince")}</span></div>
              <div data-label={t("colActions")} onClick={(event) => event.stopPropagation()}><ClientRecordActions client={client} services={services} packages={packages} /></div>
            </article>
          ))}
          {filtered.length === 0 ? (
            <div className="client-directory-empty">
              <Search size={22} />
              <h3>{t("noMatchTitle")}</h3>
              <p>{t("noMatchHint")}</p>
              <button type="button" className="button secondary small" onClick={resetFilters}>{t("resetFilters")}</button>
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}
