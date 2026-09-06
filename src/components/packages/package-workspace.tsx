"use client";

import { AlertTriangle, Dumbbell, PackageIcon, Pencil, Plus, Salad, Trash2, UserPlus, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useActionState, useState } from "react";
import {
  assignPackageAction,
  createPackageAction,
  deletePackageAction,
  updatePackageAction,
  type PackageActionState,
} from "@/app/actions/packages";
import { PACKAGE_BILLING_INTERVALS, PACKAGE_CATEGORIES } from "@/lib/package-tiers";
import { ModalPortal } from "@/components/dashboard/modal-portal";
import { Badge, Card } from "@/components/dashboard/primitives";
import type { PlanClient } from "@/components/plans/plan-builders";

export type PackageGroupOption = { id: number; name: string };

export type PackageRow = {
  id: number;
  name: string;
  category: string;
  description: string;
  price: number;
  billingInterval: string;
  isActive: boolean;
  dietGroupId: number | null;
  workoutGroupId: number | null;
  dietGroupName: string | null;
  workoutGroupName: string | null;
};

const initialState: PackageActionState = {};
const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

function ActionMessage({ state }: { state: PackageActionState }) {
  if (state.error) return <p className="form-message error" role="alert">{state.error}</p>;
  if (state.success) return <p className="form-message success" role="status">{state.success}</p>;
  return null;
}

function PackageForm({ pkg, dietGroups, workoutGroups, onSuccess }: { pkg?: PackageRow; dietGroups: PackageGroupOption[]; workoutGroups: PackageGroupOption[]; onSuccess: () => void }) {
  const t = useTranslations("Packages.catalog");
  const tc = useTranslations("Common");
  const tt = useTranslations("Common.tiers");
  const [state, action, pending] = useActionState(async (previous: PackageActionState, formData: FormData) => {
    const result = pkg ? await updatePackageAction(previous, formData) : await createPackageAction(previous, formData);
    if (result.success) onSuccess();
    return result;
  }, initialState);

  return (
    <form action={action} className="service-editor-form">
      {pkg ? <input type="hidden" name="id" value={pkg.id} /> : null}
      <div className="form-grid">
        <label><span>{t("packageName")}</span><input name="name" defaultValue={pkg?.name} placeholder={t("packageNamePlaceholder")} required minLength={2} maxLength={120} /></label>
        <label><span>{t("category")}</span><select name="category" defaultValue={pkg?.category || "beginner"}>{PACKAGE_CATEGORIES.map((category) => <option key={category} value={category}>{tt(category)}</option>)}</select></label>
        <label><span>{t("price")}</span><input name="price" type="number" min="0" step="0.01" defaultValue={pkg?.price ?? 0} required /></label>
        <label><span>{t("billing")}</span><select name="billing_interval" defaultValue={pkg?.billingInterval || "monthly"}>{PACKAGE_BILLING_INTERVALS.map((interval) => <option key={interval} value={interval}>{tc(`billing.${interval === "one_time" ? "oneTime" : interval}`)}</option>)}</select></label>
        <label><span>{t("dietGroup")}</span><select name="diet_group_id" defaultValue={pkg?.dietGroupId ?? ""}><option value="">{t("noDietGroup")}</option>{dietGroups.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}</select></label>
        <label><span>{t("workoutGroup")}</span><select name="workout_group_id" defaultValue={pkg?.workoutGroupId ?? ""}><option value="">{t("noWorkoutGroup")}</option>{workoutGroups.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}</select></label>
        <label><span>{t("availability")}</span><select name="is_active" defaultValue={pkg?.isActive === false ? "false" : "true"}><option value="true">{tc("status.active")}</option><option value="false">{tc("status.inactive")}</option></select></label>
        <label className="full"><span>{t("description")}</span><textarea name="description" rows={4} maxLength={2000} defaultValue={pkg?.description} placeholder={t("descriptionPlaceholder")} /></label>
      </div>
      {state.error ? <p className="form-message error" role="alert">{state.error}</p> : null}
      <div className="form-submit"><span>{pkg ? t("assignEditHint") : t("createHint")}</span><button className="button primary" type="submit" disabled={pending}>{pending ? tc("saving") : pkg ? t("saveChanges") : t("createPackage")}</button></div>
    </form>
  );
}

function AssignPackageForm({ pkg, clients, onSuccess }: { pkg: PackageRow; clients: PlanClient[]; onSuccess: () => void }) {
  const t = useTranslations("Packages.catalog");
  const tc = useTranslations("Common");
  const [state, action, pending] = useActionState(async (previous: PackageActionState, formData: FormData) => {
    const result = await assignPackageAction(previous, formData);
    if (result.success) onSuccess();
    return result;
  }, initialState);

  return (
    <form action={action} className="tier-assign-form">
      <input type="hidden" name="package_id" value={pkg.id} />
      <label>
        <span>{t("assignClientLabel")}</span>
        <select name="client_id" defaultValue="" required>
          <option value="" disabled>{t("selectAClient")}</option>
          {clients.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}
        </select>
      </label>
      <button className="button primary" type="submit" disabled={pending || clients.length === 0}>{pending ? tc("assigning") : t("assignPackage")}</button>
      <ActionMessage state={state} />
    </form>
  );
}

function PackageCard({ pkg, dietGroups, workoutGroups, clients }: { pkg: PackageRow; dietGroups: PackageGroupOption[]; workoutGroups: PackageGroupOption[]; clients: PlanClient[] }) {
  const t = useTranslations("Packages.catalog");
  const tc = useTranslations("Common");
  const tt = useTranslations("Common.tiers");
  const [editing, setEditing] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [groupRequiredPrompt, setGroupRequiredPrompt] = useState(false);
  const [deleteState, deleteAction, deletePending] = useActionState(async (previous: PackageActionState, formData: FormData) => {
    const result = await deletePackageAction(previous, formData);
    if (result.success) setDeleting(false);
    return result;
  }, initialState);
  const canAssign = Boolean(pkg.dietGroupId || pkg.workoutGroupId);

  return (
    <Card className="service-card package-card managed-service-card">
      <div className="service-card-head">
        <span className="service-icon"><PackageIcon size={18} /></span>
        <div>
          <Badge tone={pkg.isActive ? "success" : "neutral"}>{pkg.isActive ? tc("status.active") : tc("status.inactive")}</Badge>
          <div className="record-actions management-action-cluster" aria-label={`${tc("edit")} / ${tc("delete")} ${pkg.name}`}>
            <button className="management-icon-button" type="button" title={t("editEyebrow")} aria-label={`${t("editEyebrow")} ${pkg.name}`} onClick={() => setEditing(true)}><Pencil size={14} /><span>{tc("edit")}</span></button>
            <button className="management-icon-button danger-action" type="button" title={tc("delete")} aria-label={`${tc("delete")} ${pkg.name}`} onClick={() => setDeleting(true)}><Trash2 size={14} /><span className="sr-only">{tc("delete")}</span></button>
          </div>
        </div>
      </div>
      <span className="service-type-label">{tt(pkg.category) || pkg.category}</span>
      <h2>{pkg.name}</h2>
      <p>{pkg.description || t("noDescription")}</p>
      <div className="package-groups-row">
        <span className={pkg.dietGroupName ? "" : "is-empty"}><Salad size={13} /> {pkg.dietGroupName || t("noDietGroupLinked")}</span>
        <span className={pkg.workoutGroupName ? "" : "is-empty"}><Dumbbell size={13} /> {pkg.workoutGroupName || t("noWorkoutGroupLinked")}</span>
      </div>
      <div className="service-price"><strong>{money.format(pkg.price)}</strong><span>{tc(`billing.${pkg.billingInterval === "one_time" ? "oneTime" : pkg.billingInterval}`)}</span></div>
      <div className="service-foot">
        <span>{canAssign ? t("readyToAssign") : t("linkGroupFirst")}</span>
        <button className="button primary small" type="button" onClick={() => { if (canAssign) { setAssigning(true); } else { setGroupRequiredPrompt(true); } }} disabled={clients.length === 0}><UserPlus size={14} /> {t("assignToClient")}</button>
      </div>

      {editing ? <ModalPortal><div className="plan-modal-backdrop" role="presentation" onMouseDown={() => setEditing(false)}><div className="plan-modal wide" role="dialog" aria-modal="true" aria-label={`${t("editEyebrow")} ${pkg.name}`} onMouseDown={(event) => event.stopPropagation()}><button className="modal-close icon-button" type="button" aria-label={tc("close")} onClick={() => setEditing(false)}><X size={18} /></button><section className="builder-panel service-modal-panel"><header><span className="eyebrow">{t("editEyebrow")}</span><h2>{pkg.name}</h2><p>{t("editHint")}</p></header><PackageForm pkg={pkg} dietGroups={dietGroups} workoutGroups={workoutGroups} onSuccess={() => setEditing(false)} /></section></div></div></ModalPortal> : null}

      {assigning ? <ModalPortal><div className="plan-modal-backdrop" role="presentation" onMouseDown={() => setAssigning(false)}><div className="plan-modal" role="dialog" aria-modal="true" aria-label={t("assignTitle", { name: pkg.name })} onMouseDown={(event) => event.stopPropagation()}><button className="modal-close icon-button" type="button" aria-label={tc("close")} onClick={() => setAssigning(false)}><X size={18} /></button><section className="builder-panel tier-modal-panel"><header><span className="eyebrow">{t("clientAssignmentEyebrow")}</span><h2>{t("assignTitle", { name: pkg.name })}</h2><p>{t("assignBody")}</p></header><AssignPackageForm pkg={pkg} clients={clients} onSuccess={() => setAssigning(false)} /></section></div></div></ModalPortal> : null}

      {groupRequiredPrompt ? <ModalPortal><div className="plan-modal-backdrop" role="presentation" onMouseDown={() => setGroupRequiredPrompt(false)}><div className="plan-modal confirm-modal" role="alertdialog" aria-modal="true" aria-label={t("groupRequiredTitle")} onMouseDown={(event) => event.stopPropagation()}><button className="modal-close icon-button" type="button" aria-label={tc("close")} onClick={() => setGroupRequiredPrompt(false)}><X size={18} /></button><section className="builder-panel"><span className="eyebrow">{t("groupRequiredTitle")}</span><h2>{t("groupRequiredTitle")}</h2><p>{t("groupRequiredBody")}</p><div className="confirm-actions"><button className="button secondary" type="button" onClick={() => setGroupRequiredPrompt(false)}>{tc("cancel")}</button><button className="button primary" type="button" onClick={() => { setGroupRequiredPrompt(false); setEditing(true); }}>{t("groupRequiredCta")}</button></div></section></div></div></ModalPortal> : null}

      {deleting ? <ModalPortal><div className="plan-modal-backdrop" role="presentation" onMouseDown={() => setDeleting(false)}><div className="plan-modal confirm-modal" role="alertdialog" aria-modal="true" aria-label={`${tc("delete")} ${pkg.name}`} onMouseDown={(event) => event.stopPropagation()}><button className="modal-close icon-button" type="button" aria-label={tc("close")} onClick={() => setDeleting(false)}><X size={18} /></button><section className="builder-panel destructive-panel"><span className="destructive-icon"><AlertTriangle size={22} /></span><span className="eyebrow">{t("areYouSure")}</span><h2>{t("deleteTitle", { name: pkg.name })}</h2><p>{t("deleteBody")}</p><form action={deleteAction}><input type="hidden" name="id" value={pkg.id} />{deleteState.error ? <p className="form-message error" role="alert">{deleteState.error}</p> : null}<div className="confirm-actions"><button className="button secondary" type="button" onClick={() => setDeleting(false)}>{tc("cancel")}</button><button className="button danger" type="submit" disabled={deletePending}>{deletePending ? tc("deleting") : t("yesDelete")}</button></div></form></section></div></div></ModalPortal> : null}
    </Card>
  );
}

export function PackagesWorkspace({ packages, dietGroups, workoutGroups, clients }: { packages: PackageRow[]; dietGroups: PackageGroupOption[]; workoutGroups: PackageGroupOption[]; clients: PlanClient[] }) {
  const t = useTranslations("Packages.catalog");
  const tc = useTranslations("Common");
  const [creating, setCreating] = useState(false);

  return (
    <>
      <div className="service-library-toolbar">
        <div><span className="workspace-icon"><PackageIcon size={19} /></span><div><strong>{t("toolbarTitle")}</strong><span>{t("toolbarSubtitle", { count: packages.length })}</span></div></div>
        <button className="button primary" type="button" onClick={() => setCreating(true)}><Plus size={16} /> {t("createPackage")}</button>
      </div>

      {packages.length === 0 ? <Card className="empty-state"><PackageIcon size={24} /><h3>{t("noPackagesTitle")}</h3><p>{t("noPackagesHint")}</p></Card> : <div className="service-grid package-grid">{packages.map((pkg) => <PackageCard key={pkg.id} pkg={pkg} dietGroups={dietGroups} workoutGroups={workoutGroups} clients={clients} />)}</div>}

      {creating ? <ModalPortal><div className="plan-modal-backdrop" role="presentation" onMouseDown={() => setCreating(false)}><div className="plan-modal wide" role="dialog" aria-modal="true" aria-label={t("createTitle")} onMouseDown={(event) => event.stopPropagation()}><button className="modal-close icon-button" type="button" aria-label={tc("close")} onClick={() => setCreating(false)}><X size={18} /></button><section className="builder-panel service-modal-panel"><header><span className="eyebrow">{t("createEyebrow")}</span><h2>{t("createTitle")}</h2><p>{t("createModalHint")}</p></header><PackageForm dietGroups={dietGroups} workoutGroups={workoutGroups} onSuccess={() => setCreating(false)} /></section></div></div></ModalPortal> : null}
    </>
  );
}
