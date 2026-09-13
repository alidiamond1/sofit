"use client";

import { Activity, Flame, Moon, Scale, Utensils } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { submitClientCheckInAction } from "@/app/actions/client";
import { countProgressPhotos, type ProgressPhotos } from "@/lib/progress-photos";
import { calculateBmi } from "@/lib/body-metrics";
import { ProgressPhotoUploader } from "./progress-photos";

/** The whole weekly check-in form. A client component (rather than the plain
 *  server-rendered fields it replaces) only because the progress-photo count
 *  needs to gate the submit button — everything else behaves exactly as it
 *  did before. `submitClientCheckInAction` stays the form's action. */
export function CheckInForm({ initialPhotos, heightCm, showBmi, initialWeight }: { initialPhotos: ProgressPhotos | null; heightCm: number | null; showBmi: boolean; initialWeight: string }) {
  const t = useTranslations("ClientCheckIn");
  const tp = useTranslations("ProgressPhotos");
  const tb = useTranslations("BodyMetrics");
  const [weight, setWeight] = useState(initialWeight);
  const bmi = showBmi ? calculateBmi(heightCm, weight) : null;
  const [photoCount, setPhotoCount] = useState(() => countProgressPhotos(initialPhotos));
  const [skipPhotos, setSkipPhotos] = useState(false);
  const photosComplete = photoCount >= 3;
  const canSubmit = photosComplete || skipPhotos;

  return (
    <form action={submitClientCheckInAction} className="checkin-form-grid">
      <div className="checkin-section">
        <span className="checkin-section-label">{t("thisWeeksNumbers")}</span>
        <div className="checkin-field-grid">
          <label className="checkin-field">
            <span className="checkin-field-copy"><i className="task-icon sky"><Scale size={16} /></i>{t("currentWeightKg")}</span>
            <input name="weight_kg" type="number" min="1" max="500" step="0.1" value={weight} onChange={(event) => setWeight(event.target.value)} required />
            {bmi !== null && <small aria-live="polite">BMI: {bmi.toFixed(1)} · {tb("previewHint")}</small>}
          </label>
          <label className="checkin-field">
            <span className="checkin-field-copy"><i className="task-icon mint"><Utensils size={16} /></i>{t("dietAdherencePct")}</span>
            <input name="diet_adherence_pct" type="number" min="0" max="100" required />
          </label>
          <label className="checkin-field">
            <span className="checkin-field-copy"><i className="task-icon sand"><Activity size={16} /></i>{t("workoutCompletionPct")}</span>
            <input name="workout_completion_pct" type="number" min="0" max="100" required />
          </label>
        </div>
      </div>

      <div className="checkin-section">
        <span className="checkin-section-label">{t("howYoureFeeling")}</span>
        <div className="checkin-field-grid">
          <label className="checkin-field">
            <span className="checkin-field-copy"><i className="task-icon rose"><Flame size={16} /></i>{t("energyScore")}</span>
            <input name="energy_score" type="number" min="1" max="10" required />
          </label>
          <label className="checkin-field">
            <span className="checkin-field-copy"><i className="task-icon violet"><Moon size={16} /></i>{t("sleepQuality")}</span>
            <input name="sleep_score" type="number" min="1" max="10" required />
          </label>
        </div>
      </div>

      <div className="checkin-section checkin-photos-section">
        <div className="checkin-section-heading">
          <span className="checkin-section-label">{t("progressPhotosLabel")}</span>
          <p className="checkin-section-lede">{t("progressPhotosLede")}</p>
        </div>
        <ProgressPhotoUploader initial={initialPhotos} onCountChange={setPhotoCount} />
      </div>

      <label className="checkin-notes">
        <span>{t("notesLabel")}</span>
        <textarea name="client_notes" rows={5} required placeholder={t("notesPlaceholder")} />
      </label>

      <div className="form-submit">
        <span>{canSubmit ? (skipPhotos && !photosComplete ? tp("skippedNotice") : t("reviewHint")) : tp("completeAllHint")}</span>
        <button className="button primary" type="submit" disabled={!canSubmit}>{t("submitButton")}</button>
      </div>
      {!photosComplete && !skipPhotos ? (
        <button type="button" className="checkin-skip-photos" onClick={() => setSkipPhotos(true)}>
          {tp("skipCta")}
        </button>
      ) : null}
    </form>
  );
}
