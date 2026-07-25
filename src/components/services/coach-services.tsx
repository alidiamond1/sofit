"use client";

import { AlertTriangle, BriefcaseBusiness, Pencil, Plus, Trash2, X } from "lucide-react";
import { useActionState, useState } from "react";
import {
  createServiceAction,
  deleteServiceAction,
  updateServiceAction,
  type ServiceActionState,
} from "@/app/actions/services";
import { ModalPortal } from "@/components/dashboard/modal-portal";
import { Badge, Card } from "@/components/dashboard/primitives";

export type EditableService = {
  id: number;
  name: string;
  type: "consultation" | "diet" | "workout" | "personal_training";
  tier: "elite" | "business" | "athlete" | null;
  price: number;
  billingInterval: "one_time" | "monthly" | "quarterly";
  description: string;
  isActive: boolean;
  clientCount: number;
  packageCount: number;
};

const initialState: ServiceActionState = {};
const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

function displayType(service: EditableService) {
  if (service.type === "personal_training") return `${service.tier || "Personal"} training`;
  return service.type.replaceAll("_", " ");
}

function ServiceForm({ service, onSuccess }: { service?: EditableService; onSuccess: () => void }) {
  const [type, setType] = useState<EditableService["type"]>(service?.type || "consultation");
  const [state, action, pending] = useActionState(async (previous: ServiceActionState, formData: FormData) => {
    const result = service
      ? await updateServiceAction(previous, formData)
      : await createServiceAction(previous, formData);
    if (result.success) onSuccess();
    return result;
  }, initialState);

  return (
    <form action={action} className="service-editor-form">
      {service ? <input type="hidden" name="id" value={service.id} /> : null}
      <div className="form-grid">
        <label><span>Service name</span><input name="name" defaultValue={service?.name} placeholder="Example: Mobility Coaching" required minLength={2} maxLength={100} /></label>
        <label><span>Service type</span><select name="type" value={type} onChange={(event) => setType(event.target.value as EditableService["type"])}><option value="consultation">Consultation</option><option value="diet">Diet plan</option><option value="workout">Workout plan</option><option value="personal_training">Personal training</option></select></label>
        {type === "personal_training" ? <label><span>Training tier</span><select name="tier" defaultValue={service?.tier || ""} required><option value="" disabled>Select a tier</option><option value="elite">Elite</option><option value="business">Business</option><option value="athlete">Athlete</option></select></label> : <input type="hidden" name="tier" value="" />}
        <label><span>Price (USD)</span><input name="price" type="number" min="0" step="0.01" defaultValue={service?.price ?? 0} required /></label>
        <label><span>Billing</span><select name="billing_interval" defaultValue={service?.billingInterval || "one_time"}><option value="one_time">One time</option><option value="monthly">Monthly</option><option value="quarterly">Quarterly</option></select></label>
        <label><span>Availability</span><select name="is_active" defaultValue={service?.isActive === false ? "false" : "true"}><option value="true">Active</option><option value="false">Inactive</option></select></label>
        <label className="full"><span>Description</span><textarea name="description" rows={4} maxLength={5000} defaultValue={service?.description} placeholder="Explain what the client receives from this service." /></label>
      </div>
      {state.error ? <p className="form-message error" role="alert">{state.error}</p> : null}
      <div className="form-submit"><span>{service ? "Assigned clients keep their current account while the service details update." : "The new service becomes available for packages and client assignment."}</span><button className="button primary" type="submit" disabled={pending}>{pending ? "Saving..." : service ? "Save changes" : "Create service"}</button></div>
    </form>
  );
}

function ServiceCardActions({ service }: { service: EditableService }) {
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteState, deleteAction, deletePending] = useActionState(async (previous: ServiceActionState, formData: FormData) => {
    const result = await deleteServiceAction(previous, formData);
    if (result.success) setDeleting(false);
    return result;
  }, initialState);

  return (
    <>
      <div className="record-actions management-action-cluster" aria-label={`Manage ${service.name}`}>
        <button className="management-icon-button" type="button" title="Edit service" aria-label={`Edit ${service.name}`} onClick={() => setEditing(true)}><Pencil size={14} /><span>Edit</span></button>
        <button className="management-icon-button danger-action" type="button" title="Delete service" aria-label={`Delete ${service.name}`} onClick={() => setDeleting(true)}><Trash2 size={14} /><span className="sr-only">Delete</span></button>
      </div>

      {editing ? <ModalPortal><div className="plan-modal-backdrop" role="presentation" onMouseDown={() => setEditing(false)}><div className="plan-modal wide" role="dialog" aria-modal="true" aria-label={`Edit ${service.name}`} onMouseDown={(event) => event.stopPropagation()}><button className="modal-close icon-button" type="button" aria-label="Close" onClick={() => setEditing(false)}><X size={18} /></button><section className="builder-panel service-modal-panel"><header><span className="eyebrow">Edit service</span><h2>{service.name}</h2><p>Adjust pricing, type, tier, description, or availability.</p></header><ServiceForm service={service} onSuccess={() => setEditing(false)} /></section></div></div></ModalPortal> : null}

      {deleting ? <ModalPortal><div className="plan-modal-backdrop" role="presentation" onMouseDown={() => setDeleting(false)}><div className="plan-modal confirm-modal" role="alertdialog" aria-modal="true" aria-label={`Delete ${service.name}`} onMouseDown={(event) => event.stopPropagation()}><button className="modal-close icon-button" type="button" aria-label="Close" onClick={() => setDeleting(false)}><X size={18} /></button><section className="builder-panel destructive-panel"><span className="destructive-icon"><AlertTriangle size={22} /></span><span className="eyebrow">Are you sure?</span><h2>Delete {service.name}?</h2><p>{service.clientCount > 0 ? `${service.clientCount} client account(s) will lose this primary service. ` : ""}{service.packageCount > 0 ? `It will also be removed from ${service.packageCount} package(s). ` : ""}Sessions and invoices remain, but their service link will be cleared. This cannot be undone.</p><form action={deleteAction}><input type="hidden" name="id" value={service.id} />{deleteState.error ? <p className="form-message error" role="alert">{deleteState.error}</p> : null}<div className="confirm-actions"><button className="button secondary" type="button" onClick={() => setDeleting(false)}>Cancel</button><button className="button danger" type="submit" disabled={deletePending}>{deletePending ? "Deleting..." : "Yes, delete service"}</button></div></form></section></div></div></ModalPortal> : null}
    </>
  );
}

export function CoachServicesWorkspace({ services }: { services: EditableService[] }) {
  const [creating, setCreating] = useState(false);

  return (
    <>
      <div className="service-library-toolbar">
        <div><span className="workspace-icon"><BriefcaseBusiness size={19} /></span><div><strong>Service library</strong><span>{services.length} coaching offers available to manage</span></div></div>
        <button className="button primary" type="button" onClick={() => setCreating(true)}><Plus size={16} /> Create service</button>
      </div>

      {services.length === 0 ? <Card className="empty-state"><BriefcaseBusiness size={24} /><h3>No services yet</h3><p>Create the first coaching service to begin.</p></Card> : <div className="service-grid">{services.map((service) => <Card className="service-card managed-service-card" key={service.id}><div className="service-card-head"><span className="service-icon"><BriefcaseBusiness size={18} /></span><div><Badge tone={service.isActive ? "success" : "neutral"}>{service.isActive ? "Active" : "Inactive"}</Badge><ServiceCardActions service={service} /></div></div><span className="service-type-label">{displayType(service)}</span><h2>{service.name}</h2><p>{service.description || "No description has been added."}</p><div className="service-price"><strong>{money.format(service.price)}</strong><span>{service.billingInterval.replaceAll("_", " ")}</span></div><div className="service-foot"><span>{service.clientCount} assigned clients</span><Badge>{service.packageCount} packages</Badge></div></Card>)}</div>}

      {creating ? <ModalPortal><div className="plan-modal-backdrop" role="presentation" onMouseDown={() => setCreating(false)}><div className="plan-modal wide" role="dialog" aria-modal="true" aria-label="Create a service" onMouseDown={(event) => event.stopPropagation()}><button className="modal-close icon-button" type="button" aria-label="Close" onClick={() => setCreating(false)}><X size={18} /></button><section className="builder-panel service-modal-panel"><header><span className="eyebrow">New coaching offer</span><h2>Create a service</h2><p>Define the offer once, then use it in packages and assign it to clients.</p></header><ServiceForm onSuccess={() => setCreating(false)} /></section></div></div></ModalPortal> : null}
    </>
  );
}
