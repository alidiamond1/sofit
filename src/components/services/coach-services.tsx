"use client";

import { AlertTriangle, BriefcaseBusiness, Pencil, Plus, Trash2, X } from "lucide-react";
import { useTranslations } from "next-intl";
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

function useDisplayType() {
  const t = useTranslations("Services");
  const tt = useTranslations("Common.tiers");
  return (service: EditableService) => {
    if (service.type === "personal_training") return `${service.tier ? tt(service.tier) : t("typePersonalTraining")} ${t("typeTrainingSuffix")}`;
    const key = service.type === "diet" ? "typeDiet" : service.type === "workout" ? "typeWorkout" : "typeConsultation";
    return t(key);
  };
}

function ServiceForm({ service, onSuccess }: { service?: EditableService; onSuccess: () => void }) {
  const t = useTranslations("Services");
  const tc = useTranslations("Common");
  const tt = useTranslations("Common.tiers");
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
        <label><span>{t("serviceName")}</span><input name="name" defaultValue={service?.name} placeholder={t("serviceNamePlaceholder")} required minLength={2} maxLength={100} /></label>
        <label><span>{t("serviceType")}</span><select name="type" value={type} onChange={(event) => setType(event.target.value as EditableService["type"])}><option value="consultation">{t("typeConsultation")}</option><option value="diet">{t("typeDiet")}</option><option value="workout">{t("typeWorkout")}</option><option value="personal_training">{t("typePersonalTraining")}</option></select></label>
        {type === "personal_training" ? <label><span>{t("trainingTier")}</span><select name="tier" defaultValue={service?.tier || ""} required><option value="" disabled>{t("selectATier")}</option><option value="elite">{tt("elite")}</option><option value="business">{tt("business")}</option><option value="athlete">{tt("athlete")}</option></select></label> : <input type="hidden" name="tier" value="" />}
        <label><span>{t("price")}</span><input name="price" type="number" min="0" step="0.01" defaultValue={service?.price ?? 0} required /></label>
        <label><span>{t("billing")}</span><select name="billing_interval" defaultValue={service?.billingInterval || "one_time"}><option value="one_time">{tc("billing.oneTime")}</option><option value="monthly">{tc("billing.monthly")}</option><option value="quarterly">{tc("billing.quarterly")}</option></select></label>
        <label><span>{t("availability")}</span><select name="is_active" defaultValue={service?.isActive === false ? "false" : "true"}><option value="true">{tc("status.active")}</option><option value="false">{tc("status.inactive")}</option></select></label>
        <label className="full"><span>{t("description")}</span><textarea name="description" rows={4} maxLength={5000} defaultValue={service?.description} placeholder={t("descriptionPlaceholder")} /></label>
      </div>
      {state.error ? <p className="form-message error" role="alert">{state.error}</p> : null}
      <div className="form-submit"><span>{service ? t("editHintAssigned") : t("createHint")}</span><button className="button primary" type="submit" disabled={pending}>{pending ? tc("saving") : service ? t("saveChanges") : t("createService")}</button></div>
    </form>
  );
}

function ServiceCardActions({ service }: { service: EditableService }) {
  const t = useTranslations("Services");
  const tc = useTranslations("Common");
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteState, deleteAction, deletePending] = useActionState(async (previous: ServiceActionState, formData: FormData) => {
    const result = await deleteServiceAction(previous, formData);
    if (result.success) setDeleting(false);
    return result;
  }, initialState);

  return (
    <>
      <div className="record-actions management-action-cluster" aria-label={t("manageAria", { name: service.name })}>
        <button className="management-icon-button" type="button" title={t("editEyebrow")} aria-label={t("editServiceAria", { name: service.name })} onClick={() => setEditing(true)}><Pencil size={14} /><span>{tc("edit")}</span></button>
        <button className="management-icon-button danger-action" type="button" title={tc("delete")} aria-label={t("deleteServiceAria", { name: service.name })} onClick={() => setDeleting(true)}><Trash2 size={14} /><span className="sr-only">{tc("delete")}</span></button>
      </div>

      {editing ? <ModalPortal><div className="plan-modal-backdrop" role="presentation" onMouseDown={() => setEditing(false)}><div className="plan-modal wide" role="dialog" aria-modal="true" aria-label={t("editServiceAria", { name: service.name })} onMouseDown={(event) => event.stopPropagation()}><button className="modal-close icon-button" type="button" aria-label={tc("close")} onClick={() => setEditing(false)}><X size={18} /></button><section className="builder-panel service-modal-panel"><header><span className="eyebrow">{t("editEyebrow")}</span><h2>{service.name}</h2><p>{t("editHint")}</p></header><ServiceForm service={service} onSuccess={() => setEditing(false)} /></section></div></div></ModalPortal> : null}

      {deleting ? <ModalPortal><div className="plan-modal-backdrop" role="presentation" onMouseDown={() => setDeleting(false)}><div className="plan-modal confirm-modal" role="alertdialog" aria-modal="true" aria-label={t("deleteServiceAria", { name: service.name })} onMouseDown={(event) => event.stopPropagation()}><button className="modal-close icon-button" type="button" aria-label={tc("close")} onClick={() => setDeleting(false)}><X size={18} /></button><section className="builder-panel destructive-panel"><span className="destructive-icon"><AlertTriangle size={22} /></span><span className="eyebrow">{t("areYouSure")}</span><h2>{t("deleteTitle", { name: service.name })}</h2><p>{service.clientCount > 0 ? t("deleteClientsNote", { count: service.clientCount }) : ""}{service.packageCount > 0 ? t("deletePackagesNote", { count: service.packageCount }) : ""}{t("deleteBody")}</p><form action={deleteAction}><input type="hidden" name="id" value={service.id} />{deleteState.error ? <p className="form-message error" role="alert">{deleteState.error}</p> : null}<div className="confirm-actions"><button className="button secondary" type="button" onClick={() => setDeleting(false)}>{tc("cancel")}</button><button className="button danger" type="submit" disabled={deletePending}>{deletePending ? tc("deleting") : t("yesDeleteService")}</button></div></form></section></div></div></ModalPortal> : null}
    </>
  );
}

export function CoachServicesWorkspace({ services }: { services: EditableService[] }) {
  const t = useTranslations("Services");
  const tc = useTranslations("Common");
  const displayType = useDisplayType();
  const [creating, setCreating] = useState(false);

  return (
    <>
      <div className="service-library-toolbar">
        <div><span className="workspace-icon"><BriefcaseBusiness size={19} /></span><div><strong>{t("toolbarTitle")}</strong><span>{t("toolbarSubtitle", { count: services.length })}</span></div></div>
        <button className="button primary" type="button" onClick={() => setCreating(true)}><Plus size={16} /> {t("createService")}</button>
      </div>

      {services.length === 0 ? <Card className="empty-state"><BriefcaseBusiness size={24} /><h3>{t("noServicesTitle")}</h3><p>{t("noServicesHint")}</p></Card> : <div className="service-grid">{services.map((service) => <Card className="service-card managed-service-card" key={service.id}><div className="service-card-head"><span className="service-icon"><BriefcaseBusiness size={18} /></span><div><Badge tone={service.isActive ? "success" : "neutral"}>{service.isActive ? tc("status.active") : tc("status.inactive")}</Badge><ServiceCardActions service={service} /></div></div><span className="service-type-label">{displayType(service)}</span><h2>{service.name}</h2><p>{service.description || t("noDescription")}</p><div className="service-price"><strong>{money.format(service.price)}</strong><span>{service.billingInterval === "one_time" ? tc("billing.oneTime") : service.billingInterval === "monthly" ? tc("billing.monthly") : tc("billing.quarterly")}</span></div><div className="service-foot"><span>{service.clientCount} {t("assignedClients")}</span><Badge>{service.packageCount} {t("packagesCount")}</Badge></div></Card>)}</div>}

      {creating ? <ModalPortal><div className="plan-modal-backdrop" role="presentation" onMouseDown={() => setCreating(false)}><div className="plan-modal wide" role="dialog" aria-modal="true" aria-label={t("createTitle")} onMouseDown={(event) => event.stopPropagation()}><button className="modal-close icon-button" type="button" aria-label={tc("close")} onClick={() => setCreating(false)}><X size={18} /></button><section className="builder-panel service-modal-panel"><header><span className="eyebrow">{t("createEyebrow")}</span><h2>{t("createTitle")}</h2><p>{t("createHintModal")}</p></header><ServiceForm onSuccess={() => setCreating(false)} /></section></div></div></ModalPortal> : null}
    </>
  );
}
