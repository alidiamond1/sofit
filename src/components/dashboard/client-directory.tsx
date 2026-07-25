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
import { useActionState, useDeferredValue, useMemo, useState } from "react";
import { deleteClientAction, updateClientAction, type ClientActionState } from "@/app/actions/clients";
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
  { key: "all", label: "All clients", icon: UsersRound },
  { key: "lead", label: "Lead", icon: CircleDashed },
  { key: "onboarding", label: "Onboarding", icon: RefreshCw },
  { key: "active", label: "Active", icon: UserRoundCheck },
  { key: "renewal", label: "Renewal", icon: CheckCircle2 },
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

  return (
    <>
      <div className="record-actions management-action-cluster client-row-actions" aria-label={`Manage ${client.name}`}>
        <button className="management-icon-button" type="button" title="Edit client" aria-label={`Edit ${client.name}`} onClick={() => setEditing(true)}><Pencil size={14} /><span>Edit</span></button>
        <button className="management-icon-button danger-action" type="button" title="Delete client" aria-label={`Delete ${client.name}`} onClick={() => setDeleting(true)}><Trash2 size={14} /><span className="sr-only">Delete</span></button>
      </div>

      {editing ? (
        <ModalPortal><div className="plan-modal-backdrop" role="presentation" onMouseDown={() => setEditing(false)}>
          <div className="plan-modal wide" role="dialog" aria-modal="true" aria-label={`Edit ${client.name}`} onMouseDown={(event) => event.stopPropagation()}>
            <button className="modal-close icon-button" type="button" aria-label="Close" onClick={() => setEditing(false)}><X size={18} /></button>
            <section className="builder-panel client-modal-panel">
              <header><span className="eyebrow">Client management</span><h2>Edit {client.name}</h2><p>Update identity, coaching assignment, and journey status from one place.</p></header>
              <form action={editAction} className="client-edit-form">
                <input type="hidden" name="id" value={client.id} />
                <div className="form-grid">
                  <label><span>Full name</span><input name="name" defaultValue={client.name} required minLength={2} maxLength={120} /></label>
                  <label><span>Email address</span><input name="email" type="email" defaultValue={client.email} required maxLength={190} /></label>
                  <label><span>Phone number</span><input name="phone" defaultValue={client.phone} maxLength={40} placeholder="Phone number" /></label>
                  <label><span>Date of birth</span><input name="date_of_birth" type="date" defaultValue={client.dateOfBirth} /></label>
                  <label><span>Account status</span><select name="status" defaultValue={client.status}><option value="active">Active</option><option value="paused">Paused</option><option value="churned">Churned</option></select></label>
                  <label><span>Pipeline stage</span><select name="pipeline_stage" defaultValue={client.pipelineStage}><option value="lead">Lead</option><option value="onboarding">Onboarding</option><option value="active">Active</option><option value="renewal">Renewal</option></select></label>
                  <label><span>Primary service</span><select name="service_id" defaultValue={client.serviceId ?? ""}><option value="">No service assigned</option>{services.map((service) => <option key={service.id} value={service.id}>{service.name}{service.isActive ? "" : " (inactive)"}</option>)}</select></label>
                  <label><span>Package</span><select name="package_id" defaultValue={client.packageId ?? ""}><option value="">No package assigned</option>{packages.map((item) => <option key={item.id} value={item.id}>{item.name} - {item.category}{item.isActive ? "" : " (inactive)"}</option>)}</select></label>
                  <label className="full"><span>Goals</span><textarea name="goals" rows={3} maxLength={5000} defaultValue={client.goals} placeholder="Client goals and coaching priorities" /></label>
                  <label className="full"><span>Medical notes</span><textarea name="medical_notes" rows={3} maxLength={5000} defaultValue={client.medicalNotes} placeholder="Relevant limitations or private coach notes" /></label>
                </div>
                {editState.error ? <p className="form-message error" role="alert">{editState.error}</p> : null}
                <div className="form-submit"><span>Changes appear in the client portal immediately.</span><button className="button primary" type="submit" disabled={editPending}>{editPending ? "Saving..." : "Save client"}</button></div>
              </form>
            </section>
          </div>
        </div></ModalPortal>
      ) : null}

      {deleting ? (
        <ModalPortal><div className="plan-modal-backdrop" role="presentation" onMouseDown={() => setDeleting(false)}>
          <div className="plan-modal confirm-modal" role="alertdialog" aria-modal="true" aria-label={`Delete ${client.name}`} onMouseDown={(event) => event.stopPropagation()}>
            <button className="modal-close icon-button" type="button" aria-label="Close" onClick={() => setDeleting(false)}><X size={18} /></button>
            <section className="builder-panel destructive-panel">
              <span className="destructive-icon"><AlertTriangle size={22} /></span>
              <span className="eyebrow">Are you sure?</span>
              <h2>Delete {client.name}?</h2>
              <p>This permanently removes the client account and their plans, sessions, check-ins, messages, and payment history. This action cannot be undone.</p>
              <form action={deleteAction}>
                <input type="hidden" name="id" value={client.id} />
                {deleteState.error ? <p className="form-message error" role="alert">{deleteState.error}</p> : null}
                <div className="confirm-actions"><button className="button secondary" type="button" onClick={() => setDeleting(false)}>Cancel</button><button className="button danger" type="submit" disabled={deletePending}>{deletePending ? "Deleting..." : "Yes, delete client"}</button></div>
              </form>
            </section>
          </div>
        </div></ModalPortal>
      ) : null}
    </>
  );
}

export function ClientDirectory({ clients, services, packages }: { clients: ClientDirectoryRow[]; services: ClientServiceOption[]; packages: ClientPackageOption[] }) {
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
            <span className="eyebrow">Live pipeline</span>
            <h2 id="client-pipeline-title">Client journey</h2>
          </div>
          <p>Select a stage to focus the directory below.</p>
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
                <span className="client-step-copy"><strong>{item.label}</strong><small>{counts.get(item.key) || 0} clients</small></span>
                {index > 0 ? <span className="client-step-index">0{index}</span> : null}
              </button>
            );
          })}
        </div>
      </section>

      <section className="client-directory-card" aria-labelledby="client-directory-title">
        <div className="client-directory-heading">
          <div>
            <span className="eyebrow">Client roster</span>
            <h2 id="client-directory-title">Client directory</h2>
            <p>{filtered.length} of {clients.length} clients shown</p>
          </div>
          <div className="client-directory-controls">
            <label className="client-search">
              <Search size={17} />
              <span className="sr-only">Search clients</span>
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search name, email or package" />
            </label>
            <label className="client-status-filter">
              <span className="sr-only">Filter by status</span>
              <select value={status} onChange={(event) => setStatus(event.target.value)}>
                <option value="all">All statuses</option>
                <option value="active">Active</option>
                <option value="paused">Paused</option>
                <option value="churned">Churned</option>
              </select>
            </label>
            {hasFilters ? <button className="client-clear-filter" type="button" onClick={resetFilters}>Clear</button> : null}
          </div>
        </div>

        <div className="client-list-head" aria-hidden="true">
          <span>Client</span><span>Program</span><span>Journey</span><span>Adherence</span><span>Joined</span><span><span className="sr-only">Actions</span></span>
        </div>
        <div className="client-records">
          {filtered.map((client, index) => (
            <article className="client-record" key={client.id}>
              <div className="client-record-person">
                <Avatar name={client.name} tone={index} src={client.avatarPath} />
                <div><strong>{client.name}</strong><span>{client.email}</span></div>
              </div>
              <div className="client-record-program" data-label="Program">
                <strong>{client.packageName || "No package assigned"}</strong>
                <span>{client.service || "Service not assigned"}</span>
              </div>
              <div className="client-record-journey" data-label="Journey">
                <Badge tone={badgeTone(client.status)}>{client.status}</Badge>
                <span className="client-stage-dot"><i />{client.pipelineStage}</span>
              </div>
              <div className="client-record-adherence" data-label="Adherence">
                <ProgressBar value={client.adherence} />
              </div>
              <div className="client-record-joined" data-label="Joined"><strong>{client.joined}</strong><span>Client since</span></div>
              <div data-label="Actions"><ClientRecordActions client={client} services={services} packages={packages} /></div>
            </article>
          ))}
          {filtered.length === 0 ? (
            <div className="client-directory-empty">
              <Search size={22} />
              <h3>No clients match this view</h3>
              <p>Try another name, status, or pipeline stage.</p>
              <button type="button" className="button secondary small" onClick={resetFilters}>Reset filters</button>
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}
