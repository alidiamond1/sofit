"use client";

/* eslint-disable @next/next/no-img-element */
import { AlertTriangle, ArrowLeft, Eye, EyeOff, ImagePlus, Loader2, Sparkles, Trash2, X } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useActionState, useRef, useState, type ChangeEvent } from "react";
import {
  deleteTransformationAction,
  togglePublishTransformationAction,
  updateTransformationAction,
  type TransformationActionState,
} from "@/app/actions/transformations";
import { ModalPortal } from "@/components/dashboard/modal-portal";
import { Badge, Card } from "@/components/dashboard/primitives";

export type TransformationRow = {
  id: number;
  displayName: string;
  beforePhotoUrl: string | null;
  afterPhotoUrl: string | null;
  description: string;
  isPublished: boolean;
};

const initialState: TransformationActionState = {};

/* ------------------------------------------------------------------
   Single-photo uploader — same signed ImageKit flow as MediaUploader /
   ProgressPhotoUploader (GET /api/imagekit-auth, then a direct POST to
   ImageKit), scoped to a single "before" or "after" photo slot.
------------------------------------------------------------------ */

const IMAGEKIT_PUBLIC_KEY = process.env.NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY;
const IMAGEKIT_READY = Boolean(IMAGEKIT_PUBLIC_KEY);
const MAX_BYTES = 20 * 1024 * 1024; // 20 MB

function TransformationPhotoUploader({
  inputName,
  label,
  defaultUrl = "",
}: {
  inputName: string;
  label: string;
  defaultUrl?: string;
}) {
  const t = useTranslations("Transformations.detail");
  const [url, setUrl] = useState(defaultUrl);
  const [status, setStatus] = useState<"idle" | "uploading" | "error">("idle");
  const fileRef = useRef<HTMLInputElement>(null);

  async function upload(file: File) {
    if (file.size > MAX_BYTES) {
      setStatus("error");
      return;
    }
    setStatus("uploading");
    try {
      const authResponse = await fetch("/api/imagekit-auth");
      if (!authResponse.ok) throw new Error(`Auth ${authResponse.status}`);
      const auth = (await authResponse.json()) as { token: string; expire: string; signature: string };

      const body = new FormData();
      body.append("file", file);
      body.append("fileName", file.name || `transformation-${auth.token}`);
      body.append("publicKey", IMAGEKIT_PUBLIC_KEY as string);
      body.append("signature", auth.signature);
      body.append("expire", auth.expire);
      body.append("token", auth.token);
      body.append("folder", "/sofit/transformations");

      const response = await fetch("https://upload.imagekit.io/api/v1/files/upload", { method: "POST", body });
      if (!response.ok) throw new Error(`ImageKit responded ${response.status}`);
      const data = (await response.json()) as { url?: string };
      if (!data.url) throw new Error("No URL returned from ImageKit.");
      setUrl(data.url);
      setStatus("idle");
    } catch {
      setStatus("error");
    }
  }

  function onPick(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) void upload(file);
    event.target.value = "";
  }

  return (
    <div className="media-uploader">
      <input type="hidden" name={inputName} value={url} />
      <div className={`media-dropzone${url ? " has-preview" : ""}`}>
        {url ? (
          <img src={url} alt={label} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        ) : (
          <div className="media-dropzone-empty">
            <span className="media-empty-icon"><ImagePlus size={22} /></span>
            <strong>{label}</strong>
          </div>
        )}
        {status === "uploading" ? (
          <div className="media-uploading" role="status"><Loader2 size={18} className="spin" /> {t("uploading")}</div>
        ) : null}
      </div>
      <div className="media-uploader-actions">
        {IMAGEKIT_READY ? (
          <button type="button" className="button secondary small" onClick={() => fileRef.current?.click()} disabled={status === "uploading"}>
            <ImagePlus size={14} /> {url ? t("replacePhoto") : t("uploadPhoto")}
          </button>
        ) : null}
      </div>
      <input ref={fileRef} type="file" accept="image/*" hidden onChange={onPick} />
      {!IMAGEKIT_READY ? <p className="media-hint">{t("imageKitNotConfigured")}</p> : null}
      {status === "error" ? <p className="media-hint error">{t("uploadFailed")}</p> : null}
    </div>
  );
}

export function TransformationDetail({ item }: { item: TransformationRow }) {
  const t = useTranslations("Transformations.detail");
  const tc = useTranslations("Common");
  const [deleting, setDeleting] = useState(false);

  const [saveState, saveAction, savePending] = useActionState(async (previous: TransformationActionState, formData: FormData) => updateTransformationAction(previous, formData), initialState);
  const [toggleState, toggleAction, togglePending] = useActionState(async (previous: TransformationActionState, formData: FormData) => togglePublishTransformationAction(previous, formData), initialState);
  const [deleteState, deleteAction, deletePending] = useActionState(async (previous: TransformationActionState, formData: FormData) => deleteTransformationAction(previous, formData), initialState);

  const hasBothPhotos = Boolean(item.beforePhotoUrl && item.afterPhotoUrl);

  return (
    <>
      <Link href="/coach/transformations" className="button secondary review-back"><ArrowLeft size={15} /> {t("backToList")}</Link>

      <Card className="transformation-detail-card">
        <div className="transformation-detail-head">
          <span className="service-icon"><Sparkles size={18} /></span>
          <div className="transformation-detail-heading">
            <Badge tone={item.isPublished ? "success" : "neutral"}>{item.isPublished ? t("published") : t("hidden")}</Badge>
            <h1>{item.displayName}</h1>
          </div>
          <form action={toggleAction}>
            <input type="hidden" name="id" value={item.id} />
            <button className="button secondary" type="submit" disabled={togglePending}>
              {item.isPublished ? <><EyeOff size={14} /> {t("hideCta")}</> : <><Eye size={14} /> {t("publishCta")}</>}
            </button>
          </form>
        </div>

        {toggleState.error ? <p className="form-message error" role="alert">{toggleState.error}</p> : null}
        {toggleState.success ? <p className="form-message success" role="status">{toggleState.success}</p> : null}
        {!hasBothPhotos ? <p className="form-message warning">{t("draftHint")}</p> : null}

        <form action={saveAction} className="service-editor-form">
          <input type="hidden" name="id" value={item.id} />
          <input type="hidden" name="is_published" value={item.isPublished ? "true" : "false"} />
          <div className="form-grid">
            <label className="full"><span>{t("displayName")}</span><input name="display_name" defaultValue={item.displayName} placeholder={t("displayNamePlaceholder")} required minLength={2} maxLength={120} /></label>
            <label><span>{t("beforePhoto")}</span><TransformationPhotoUploader inputName="before_photo_url" label={t("beforePhoto")} defaultUrl={item.beforePhotoUrl || ""} /></label>
            <label><span>{t("afterPhoto")}</span><TransformationPhotoUploader inputName="after_photo_url" label={t("afterPhoto")} defaultUrl={item.afterPhotoUrl || ""} /></label>
            <label className="full"><span>{t("description")}</span><textarea name="description" rows={4} maxLength={2000} defaultValue={item.description} placeholder={t("descriptionPlaceholder")} /></label>
          </div>
          {saveState.error ? <p className="form-message error" role="alert">{saveState.error}</p> : null}
          {saveState.success ? <p className="form-message success" role="status">{saveState.success}</p> : null}
          <div className="form-submit">
            <span>{t("saveHint")}</span>
            <button className="button primary" type="submit" disabled={savePending}>{savePending ? tc("saving") : t("saveChanges")}</button>
          </div>
        </form>

        <div className="transformation-detail-danger">
          <div><strong>{t("deleteTitle")}</strong><span>{t("deleteHint")}</span></div>
          <button className="button danger small" type="button" onClick={() => setDeleting(true)}><Trash2 size={14} /> {tc("delete")}</button>
        </div>
      </Card>

      {deleting ? (
        <ModalPortal>
          <div className="plan-modal-backdrop" role="presentation" onMouseDown={() => setDeleting(false)}>
            <div className="plan-modal confirm-modal" role="alertdialog" aria-modal="true" aria-label={`${tc("delete")} ${item.displayName}`} onMouseDown={(event) => event.stopPropagation()}>
              <button className="modal-close icon-button" type="button" aria-label={tc("close")} onClick={() => setDeleting(false)}><X size={18} /></button>
              <section className="builder-panel destructive-panel">
                <span className="destructive-icon"><AlertTriangle size={22} /></span>
                <span className="eyebrow">{t("areYouSure")}</span>
                <h2>{t("deleteConfirmTitle", { name: item.displayName })}</h2>
                <p>{t("deleteConfirmBody")}</p>
                <form action={deleteAction}>
                  <input type="hidden" name="id" value={item.id} />
                  {deleteState.error ? <p className="form-message error" role="alert">{deleteState.error}</p> : null}
                  <div className="confirm-actions">
                    <button className="button secondary" type="button" onClick={() => setDeleting(false)}>{tc("cancel")}</button>
                    <button className="button danger" type="submit" disabled={deletePending}>{deletePending ? tc("deleting") : t("yesDelete")}</button>
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
