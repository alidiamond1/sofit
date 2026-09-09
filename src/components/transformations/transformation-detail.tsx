"use client";

/* eslint-disable @next/next/no-img-element */
import { ImagePlus, Loader2, Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useActionState, useEffect, useRef, useState, type ChangeEvent } from "react";
import { deleteTransformationAction, saveTransformationAction, type TransformationActionState } from "@/app/actions/transformations";
import { parseTransformationStory, type TransformationRow } from "@/lib/transformation";
export type { TransformationRow } from "@/lib/transformation";

const initialState: TransformationActionState = {};
const IMAGEKIT_PUBLIC_KEY = process.env.NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY;
const MAX_BYTES = 20 * 1024 * 1024;

function TransformationPhotoUploader({ inputName, label, defaultUrl = "", onBusy, onChanged }: {
  inputName: string; label: string; defaultUrl?: string; onBusy: (busy: boolean) => void; onChanged: () => void;
}) {
  const t = useTranslations("Transformations.detail");
  const [url, setUrl] = useState(defaultUrl);
  const [status, setStatus] = useState<"idle" | "uploading" | "error">("idle");
  const fileRef = useRef<HTMLInputElement>(null);
  async function upload(file: File) {
    if (file.size === 0 || file.size > MAX_BYTES || !["image/jpeg", "image/png", "image/webp", "image/avif"].includes(file.type)) { setStatus("error"); return; }
    setStatus("uploading"); onBusy(true);
    try {
      const authResponse = await fetch("/api/imagekit-auth");
      if (!authResponse.ok) throw new Error("Photo authorization failed");
      const auth = await authResponse.json();
      const body = new FormData();
      body.append("file", file); body.append("fileName", file.name);
      body.append("publicKey", IMAGEKIT_PUBLIC_KEY || "");
      body.append("signature", auth.signature); body.append("expire", auth.expire); body.append("token", auth.token);
      body.append("folder", "/sofit/transformations");
      const response = await fetch("https://upload.imagekit.io/api/v1/files/upload", { method: "POST", body });
      if (!response.ok) throw new Error("Photo upload failed");
      const data = await response.json();
      if (typeof data.url !== "string" || !data.url.startsWith("https://") || data.url.length > 500) throw new Error("Invalid photo URL");
      setUrl(data.url); onChanged(); setStatus("idle");
    } catch { setStatus("error"); } finally { onBusy(false); }
  }
  function onPick(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) void upload(file);
    event.target.value = "";
  }
  return (
    <div className="transformation-upload">
      <span className="transformation-field-label">{label}</span>
      <div className="transformation-upload-preview">
        {url ? <img src={url} alt={label} /> : <ImagePlus size={30} aria-hidden="true" />}
        {status === "uploading" ? <span className="media-uploading" role="status"><Loader2 size={18} className="spin" />{t("uploading")}</span> : null}
      </div>
      <div className="transformation-upload-actions">
        {IMAGEKIT_PUBLIC_KEY ? <button type="button" className="button secondary small" onClick={() => fileRef.current?.click()} disabled={status === "uploading"}><ImagePlus size={14} />{url ? t("replacePhoto") : t("uploadPhoto")}</button> : null}
        {url ? <button type="button" className="text-button" disabled={status === "uploading"} onClick={() => { setUrl(""); onChanged(); }}>{t("removePhoto")}</button> : null}
      </div>
      <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/avif" hidden onChange={onPick} />
      <details className="transformation-photo-url"><summary>{t("usePhotoUrl")}</summary><label><span>{label} URL</span><input type="url" name={inputName} value={url} onChange={(event) => { setUrl(event.target.value); onChanged(); }} placeholder="https://" maxLength={500} disabled={status === "uploading"} /></label></details>
      <small>{t("photoHint")}</small>
      {status === "error" ? <p className="form-message error" role="alert">{t("photoError")}</p> : null}
    </div>
  );
}

export function TransformationEditor({ item, onClose, onSaved }: { item: TransformationRow | null; onClose: () => void; onSaved: () => void }) {
  const t = useTranslations("Transformations.detail");
  const tc = useTranslations("Common");
  const story = item?.story || parseTransformationStory(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const dirty = useRef(false);
  const [uploads, setUploads] = useState({ before: false, after: false });
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [state, saveAction, saving] = useActionState(async (previous: TransformationActionState, data: FormData) => {
    const result = await saveTransformationAction(previous, data);
    if (result.success) { dirty.current = false; onSaved(); }
    return result;
  }, initialState);
  const [deleteState, deleteAction, deleting] = useActionState(async (previous: TransformationActionState, data: FormData) => {
    const result = await deleteTransformationAction(previous, data);
    if (result.success) { dirty.current = false; onSaved(); }
    return result;
  }, initialState);
  const busy = saving || deleting || uploads.before || uploads.after;
  useEffect(() => {
    dialog.current?.showModal();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = overflow; };
  }, []);
  function close() {
    if (busy) return;
    if (dirty.current && !window.confirm(t("discardChanges"))) return;
    onClose();
  }
  return (
    <dialog ref={dialog} className="plan-modal transformation-editor" aria-labelledby="transformation-editor-title" onCancel={(event) => { event.preventDefault(); close(); }} onClick={(event) => { if (event.target === event.currentTarget) close(); }}>
      <div className="transformation-editor-content">
        <header className="transformation-editor-heading"><div><span className="eyebrow">{t("editorEyebrow")}</span><h2 id="transformation-editor-title">{t(item ? "editTitle" : "createTitle")}</h2><p>{t("editorHint")}</p></div><button type="button" className="icon-button" aria-label={tc("close")} disabled={busy} onClick={close}><X size={18} /></button></header>
        <form action={saveAction} onChange={() => { dirty.current = true; }}>
          <input type="hidden" name="id" value={item?.id || ""} />
          <fieldset disabled={saving || deleting} className="transformation-editor-fields">
            <div className="form-grid">
              <label><span>{t("displayName")}</span><input name="display_name" defaultValue={item?.displayName || ""} required minLength={2} maxLength={120} autoFocus /></label>
              <label><span>{t("program")}</span><input name="program" defaultValue={story.program} maxLength={120} /></label>
              <label className="full"><span>{t("headline")}</span><input name="headline" defaultValue={story.headline} maxLength={160} placeholder={t("headlinePlaceholder")} /></label>
            </div>
            <h3>{t("photosTitle")}</h3>
            <div className="transformation-editor-photos">
              <TransformationPhotoUploader inputName="before_photo_url" label={t("beforePhoto")} defaultUrl={item?.beforePhotoUrl || ""} onBusy={(value) => setUploads((current) => ({ ...current, before: value }))} onChanged={() => { dirty.current = true; }} />
              <TransformationPhotoUploader inputName="after_photo_url" label={t("afterPhoto")} defaultUrl={item?.afterPhotoUrl || ""} onBusy={(value) => setUploads((current) => ({ ...current, after: value }))} onChanged={() => { dirty.current = true; }} />
            </div>
            <h3>{t("storyTitle")}</h3>
            <div className="form-grid">
              <label className="full"><span>{t("description")}</span><textarea name="description" rows={4} maxLength={2000} defaultValue={item?.description || ""} placeholder={t("descriptionPlaceholder")} /></label>
              <label><span>{t("durationWeeks")}</span><input type="number" name="durationWeeks" min="1" max="520" step="1" defaultValue={story.durationWeeks ?? ""} /></label>
            </div>
            <details className="transformation-optional-metrics" open={story.weightBefore != null || story.bodyFatBefore != null}><summary>{t("metricsTitle")}</summary><div className="form-grid">
              {(["weightBefore", "weightAfter", "bodyFatBefore", "bodyFatAfter"] as const).map((field) => <label key={field}><span>{t(field)}</span><input name={field} type="number" min="0" max={field.startsWith("weight") ? 500 : 100} step="0.1" defaultValue={story[field] ?? ""} /></label>)}
            </div></details>
            <label className="transformation-consent"><input type="checkbox" name="consent" defaultChecked={story.consent} /><span>{t("consent")}</span></label>
          </fieldset>
          {state.error ? <p className="form-message error" role="alert">{state.error}</p> : null}
          <footer className="transformation-editor-footer"><span>{t("draftSaveHint")}</span><div><button className="button secondary" type="button" disabled={busy} onClick={close}>{tc("cancel")}</button><button className="button secondary" type="submit" name="is_published" value="false" disabled={busy}>{t("saveDraft")}</button><button className="button primary" type="submit" name="is_published" value="true" disabled={busy}>{saving ? tc("saving") : t(item?.isPublished ? "savePublished" : "publishCta")}</button></div></footer>
        </form>
        {item ? <div className="transformation-editor-delete">
          {confirmDelete ? <form action={deleteAction}><input type="hidden" name="id" value={item.id} /><p>{t("deleteConfirmBody")}</p>{deleteState.error ? <p className="form-message error" role="alert">{deleteState.error}</p> : null}<div className="confirm-actions"><button type="button" className="button secondary small" disabled={busy} onClick={() => setConfirmDelete(false)}>{tc("cancel")}</button><button type="submit" className="button danger small" disabled={busy}>{t("yesDelete")}</button></div></form> : <button type="button" className="text-button" disabled={busy} onClick={() => setConfirmDelete(true)}><Trash2 size={14} />{t("deleteTitle")}</button>}
        </div> : null}
      </div>
    </dialog>
  );
}

export function TransformationDetail({ item }: { item: TransformationRow }) {
  const router = useRouter();
  const back = () => { router.push("/coach/transformations"); router.refresh(); };
  return <TransformationEditor item={item} onClose={back} onSaved={back} />;
}
