"use client";

import { Save } from "lucide-react";
import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { updateBodyMetricsAction } from "@/app/actions/profile";

export function BodyMetricsForm({ height, startingWeight, dateOfBirth, goals, medicalNotes }: {
  height: string; startingWeight: string; dateOfBirth: string; goals: string; medicalNotes: string;
}) {
  const t = useTranslations("BodyMetrics");
  const tc = useTranslations("Common");
  const [state, action, pending] = useActionState(updateBodyMetricsAction, {});
  return <form action={action} className="account-form-grid">
    <label><span>{t("height")} *</span><input name="height_cm" type="number" min="100" max="250" step="0.1" defaultValue={height} placeholder="175" required /></label>
    <label><span>{t("startingWeight")} *</span><input name="starting_weight_kg" type="number" min="30" max="300" step="0.01" defaultValue={startingWeight} placeholder="70" aria-describedby="starting-weight-hint" required /></label>
    <p className="full field-hint" id="starting-weight-hint">{t("baselineHint")}</p>
    <label><span>{t("dateOfBirth")} *</span><input name="date_of_birth" type="date" max={new Date().toISOString().slice(0, 10)} defaultValue={dateOfBirth} required /></label>
    <p className="field-hint">{t("ageHint")}</p>
    <label className="full"><span>{t("goals")}</span><textarea name="goals" rows={3} maxLength={5000} defaultValue={goals} placeholder={t("goalsHint")} /></label>
    <label className="full"><span>{t("healthNotes")}</span><textarea name="medical_notes" rows={3} maxLength={5000} defaultValue={medicalNotes} placeholder={t("healthNotesHint")} /></label>
    <div className="account-form-footer full">
      {state.error && <p className="account-form-message error" role="alert">{state.error}</p>}
      {state.success && <p className="account-form-message success" role="status">{t("saved")}</p>}
      <button className="button primary" type="submit" disabled={pending}><Save size={15} />{pending ? tc("saving") : t("save")}</button>
    </div>
  </form>;
}
