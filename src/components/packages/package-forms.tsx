"use client";

import { AlertTriangle, Boxes, Pencil, Plus, Trash2, UserPlus, X } from "lucide-react";
import { useActionState, useState } from "react";
import {
  assignPackageAction,
  createPackageAction,
  deletePackageAction,
  updatePackageAction,
  type PackageActionState,
} from "@/app/actions/packages";
import { ModalPortal } from "@/components/dashboard/modal-portal";

export type ServiceOption = {
  id: number;
  name: string;
  type: string;
  tier: string | null;
};

export type ClientOption = {
  id: number;
  name: string;
  email: string;
};

export type PackageOption = {
  id: number;
  name: string;
  category: string;
};

export type EditablePackage = PackageOption & {
  description: string | null;
  price: number;
  billing_interval: string;
  client_count: number;
  services: Array<{ serviceId: number; quantity: number }>;
};

const initialState: PackageActionState = {};

export function PackageBuilder({
  services,
  packageRecord,
  onSuccess,
}: {
  services: ServiceOption[];
  packageRecord?: EditablePackage;
  onSuccess?: () => void;
}) {
  const [state, action, pending] = useActionState(async (previous: PackageActionState, formData: FormData) => {
    const result = packageRecord
      ? await updatePackageAction(previous, formData)
      : await createPackageAction(previous, formData);
    if (result.success) onSuccess?.();
    return result;
  }, initialState);
  const selectedServices = new Map(packageRecord?.services.map((service) => [service.serviceId, service.quantity]) || []);

  return (
    <form action={action} className="package-builder-form">
      {packageRecord ? <input type="hidden" name="id" value={packageRecord.id} /> : null}
      <div className="form-grid">
        <label>
          <span>Package name</span>
          <input name="name" placeholder="Example: Beginner Kickstart" defaultValue={packageRecord?.name} required minLength={2} maxLength={120} />
        </label>
        <label>
          <span>Package category</span>
          <select name="category" defaultValue={packageRecord?.category || "beginner"} required>
            <option value="beginner">Beginner</option>
            <option value="intermediate">Intermediate</option>
            <option value="elite">Elite</option>
            <option value="business">Business</option>
            <option value="athlete">Athlete</option>
          </select>
        </label>
        <label>
          <span>Price (USD)</span>
          <input name="price" type="number" min="0" step="0.01" defaultValue={packageRecord?.price ?? 0} required />
        </label>
        <label>
          <span>Billing</span>
          <select name="billing_interval" defaultValue={packageRecord?.billing_interval || "monthly"} required>
            <option value="one_time">One time</option>
            <option value="monthly">Monthly</option>
            <option value="quarterly">Quarterly</option>
          </select>
        </label>
        <label className="full">
          <span>Description</span>
          <textarea name="description" rows={4} placeholder="Who this package is for and what the client receives." maxLength={3000} defaultValue={packageRecord?.description || ""} />
        </label>
      </div>

      <fieldset className="package-service-picker">
        <legend>Services included</legend>
        <p>Select the services in this package and how many units or sessions are included.</p>
        <div>
          {services.map((service) => (
            <label className="package-service-option" key={service.id}>
              <input type="checkbox" name="service_ids" value={service.id} defaultChecked={selectedServices.has(service.id)} />
              <span>
                <strong>{service.name}</strong>
                <small>{service.tier || service.type.replaceAll("_", " ")}</small>
              </span>
              <input
                className="package-quantity"
                name={`quantity_${service.id}`}
                type="number"
                min="1"
                max="100"
                defaultValue={selectedServices.get(service.id) || 1}
                aria-label={`${service.name} quantity`}
              />
            </label>
          ))}
        </div>
      </fieldset>

      {state.error ? <p className="form-message error" role="alert">{state.error}</p> : null}
      {state.success ? <p className="form-message success" role="status">{state.success}</p> : null}
      <div className="form-submit">
        <span>The package becomes available for client assignment immediately.</span>
        <button className="button primary" type="submit" disabled={pending || services.length === 0}>
          {pending ? (packageRecord ? "Saving..." : "Creating...") : (packageRecord ? "Save changes" : "Create package")}
        </button>
      </div>
    </form>
  );
}

export function PackageCardActions({
  packageRecord,
  services,
}: {
  packageRecord: EditablePackage;
  services: ServiceOption[];
}) {
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteState, deleteAction, deletePending] = useActionState(async (previous: PackageActionState, formData: FormData) => {
    const result = await deletePackageAction(previous, formData);
    if (result.success) setDeleting(false);
    return result;
  }, initialState);

  return (
    <>
      <div className="record-actions">
        <button className="icon-button" type="button" aria-label={`Edit ${packageRecord.name}`} title="Edit package" onClick={() => setEditing(true)}><Pencil size={15} /></button>
        <button className="icon-button danger-action" type="button" aria-label={`Delete ${packageRecord.name}`} title="Delete package" onClick={() => setDeleting(true)}><Trash2 size={15} /></button>
      </div>

      {editing ? (
        <ModalPortal><div className="plan-modal-backdrop" role="presentation" onMouseDown={() => setEditing(false)}>
          <div className="plan-modal wide" role="dialog" aria-modal="true" aria-label={`Edit ${packageRecord.name}`} onMouseDown={(event) => event.stopPropagation()}>
            <button className="modal-close icon-button" type="button" aria-label="Close" onClick={() => setEditing(false)}><X size={18} /></button>
            <section className="builder-panel package-modal-panel">
              <header><span className="eyebrow">Edit package</span><h2>{packageRecord.name}</h2><p>Update pricing, category, description, or included services.</p></header>
              <PackageBuilder services={services} packageRecord={packageRecord} onSuccess={() => setEditing(false)} />
            </section>
          </div>
        </div></ModalPortal>
      ) : null}

      {deleting ? (
        <ModalPortal><div className="plan-modal-backdrop" role="presentation" onMouseDown={() => setDeleting(false)}>
          <div className="plan-modal confirm-modal" role="alertdialog" aria-modal="true" aria-label={`Delete ${packageRecord.name}`} onMouseDown={(event) => event.stopPropagation()}>
            <button className="modal-close icon-button" type="button" aria-label="Close" onClick={() => setDeleting(false)}><X size={18} /></button>
            <section className="builder-panel destructive-panel">
              <span className="destructive-icon"><AlertTriangle size={22} /></span>
              <span className="eyebrow">Permanent action</span>
              <h2>Delete {packageRecord.name}?</h2>
              <p>{packageRecord.client_count > 0 ? `${packageRecord.client_count} client account(s) will be unassigned from this package.` : "This package is not assigned to any clients."} Included services will also be removed.</p>
              <form action={deleteAction}>
                <input type="hidden" name="id" value={packageRecord.id} />
                {deleteState.error ? <p className="form-message error" role="alert">{deleteState.error}</p> : null}
                <div className="confirm-actions"><button className="button secondary" type="button" onClick={() => setDeleting(false)}>Cancel</button><button className="button danger" type="submit" disabled={deletePending}>{deletePending ? "Deleting..." : "Delete package"}</button></div>
              </form>
            </section>
          </div>
        </div></ModalPortal>
      ) : null}
    </>
  );
}

export function PackageAssignmentForm({
  clients,
  packages,
  onSuccess,
}: {
  clients: ClientOption[];
  packages: PackageOption[];
  onSuccess?: () => void;
}) {
  const [state, action, pending] = useActionState(async (previous: PackageActionState, formData: FormData) => {
    const result = await assignPackageAction(previous, formData);
    if (result.success) onSuccess?.();
    return result;
  }, initialState);

  return (
    <form action={action} className="package-assignment-form">
      <label>
        <span>Client</span>
        <select name="client_id" defaultValue="" required>
          <option value="" disabled>Select a client</option>
          {clients.map((client) => <option key={client.id} value={client.id}>{client.name} - {client.email}</option>)}
        </select>
      </label>
      <label>
        <span>Package</span>
        <select name="package_id" defaultValue="" required>
          <option value="" disabled>Select a package</option>
          {packages.map((item) => <option key={item.id} value={item.id}>{item.name} ({item.category})</option>)}
        </select>
      </label>
      <button className="button primary" type="submit" disabled={pending || clients.length === 0 || packages.length === 0}>
        {pending ? "Assigning..." : "Assign package"}
      </button>
      {state.error ? <p className="form-message error" role="alert">{state.error}</p> : null}
      {state.success ? <p className="form-message success" role="status">{state.success}</p> : null}
    </form>
  );
}

export function PackageWorkspace({
  services,
  clients,
  packages,
}: {
  services: ServiceOption[];
  clients: ClientOption[];
  packages: PackageOption[];
}) {
  const [createOpen, setCreateOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);

  return (
    <>
      <div className="plan-workspace-toolbar package-library-toolbar">
        <div>
          <span className="workspace-icon"><Boxes size={19} /></span>
          <div><strong>Package library</strong><span>{packages.length} active packages ready for client assignment</span></div>
        </div>
        <div>
          <button className="button secondary" type="button" onClick={() => setAssignOpen(true)} disabled={clients.length === 0 || packages.length === 0}><UserPlus size={15} /> Assign package</button>
          <button className="button primary" type="button" onClick={() => setCreateOpen(true)}><Plus size={15} /> Create package</button>
        </div>
      </div>

      {createOpen ? (
        <div className="plan-modal-backdrop" role="presentation" onMouseDown={() => setCreateOpen(false)}>
          <div className="plan-modal wide" role="dialog" aria-modal="true" aria-label="Create a package" onMouseDown={(event) => event.stopPropagation()}>
            <button className="modal-close icon-button" type="button" aria-label="Close" onClick={() => setCreateOpen(false)}><X size={18} /></button>
            <section className="builder-panel package-modal-panel">
              <header><span className="eyebrow">Package builder</span><h2>Create a package</h2><p>Combine services, set the membership level and price, then save it to your reusable library.</p></header>
              <PackageBuilder services={services} onSuccess={() => setCreateOpen(false)} />
            </section>
          </div>
        </div>
      ) : null}

      {assignOpen ? (
        <div className="plan-modal-backdrop" role="presentation" onMouseDown={() => setAssignOpen(false)}>
          <div className="plan-modal package-assign-modal" role="dialog" aria-modal="true" aria-label="Assign a package" onMouseDown={(event) => event.stopPropagation()}>
            <button className="modal-close icon-button" type="button" aria-label="Close" onClick={() => setAssignOpen(false)}><X size={18} /></button>
            <section className="builder-panel package-modal-panel">
              <header><span className="eyebrow">Client assignment</span><h2>Assign a package</h2><p>Choose a client and the active package that should appear in their portal.</p></header>
              <PackageAssignmentForm clients={clients} packages={packages} onSuccess={() => setAssignOpen(false)} />
            </section>
          </div>
        </div>
      ) : null}
    </>
  );
}
