"use client";

/* eslint-disable @next/next/no-img-element */
import { Camera, Loader2, RotateCcw, ShieldCheck, Trash2, X, ZoomIn } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRef, useState, type ChangeEvent } from "react";
import {
  PROGRESS_PHOTO_SLOTS,
  type ProgressPhotoSlot,
  type ProgressPhotos,
} from "@/lib/progress-photos";
import { ModalPortal } from "./modal-portal";

/* ------------------------------------------------------------------
   Shared bits
------------------------------------------------------------------ */

const IMAGEKIT_PUBLIC_KEY = process.env.NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY;
const IMAGEKIT_READY = Boolean(IMAGEKIT_PUBLIC_KEY);
const MAX_BYTES = 20 * 1024 * 1024; // 20 MB — generous for a phone camera photo

function slotInputName(slot: ProgressPhotoSlot) {
  return `progress_photo_${slot}`;
}

/** Full-screen tap-to-close preview, shared by every read-only surface below. */
function PhotoLightbox({ url, alt, onClose }: { url: string; alt: string; onClose: () => void }) {
  const tc = useTranslations("Common");
  return (
    <ModalPortal>
      <div className="photo-lightbox" role="dialog" aria-modal="true" aria-label={alt} onClick={onClose}>
        <button type="button" className="photo-lightbox-close icon-button" aria-label={tc("close")} onClick={onClose}>
          <X size={20} />
        </button>
        <img src={url} alt={alt} onClick={(event) => event.stopPropagation()} />
      </div>
    </ModalPortal>
  );
}

/* ------------------------------------------------------------------
   Uploader — the three-slot picker used on the weekly check-in form.
   Each slot uploads straight to ImageKit (same signed flow as
   MediaUploader in exercise-media.tsx) and writes its URL into its own
   hidden input so submitClientCheckInAction can read it by name.
------------------------------------------------------------------ */

type SlotState = { url: string; status: "idle" | "uploading" | "error" };

export function ProgressPhotoUploader({
  initial,
  onCountChange,
}: {
  initial?: ProgressPhotos | null;
  onCountChange?: (count: number) => void;
}) {
  const t = useTranslations("ProgressPhotos");
  const [slots, setSlots] = useState<Record<ProgressPhotoSlot, SlotState>>(() => ({
    front: { url: initial?.front || "", status: "idle" },
    side: { url: initial?.side || "", status: "idle" },
    back: { url: initial?.back || "", status: "idle" },
  }));
  const fileRefs = {
    front: useRef<HTMLInputElement>(null),
    side: useRef<HTMLInputElement>(null),
    back: useRef<HTMLInputElement>(null),
  };
  const [zoomed, setZoomed] = useState<ProgressPhotoSlot | null>(null);

  function applySlots(next: Record<ProgressPhotoSlot, SlotState>) {
    setSlots(next);
    onCountChange?.(PROGRESS_PHOTO_SLOTS.reduce((total, slot) => total + (next[slot].url ? 1 : 0), 0));
  }

  async function upload(slot: ProgressPhotoSlot, file: File) {
    if (file.size > MAX_BYTES) {
      applySlots({ ...slots, [slot]: { url: slots[slot].url, status: "error" } });
      return;
    }
    applySlots({ ...slots, [slot]: { url: slots[slot].url, status: "uploading" } });
    try {
      const authResponse = await fetch("/api/imagekit-auth");
      if (!authResponse.ok) throw new Error(`Auth ${authResponse.status}`);
      const auth = (await authResponse.json()) as { token: string; expire: string; signature: string };

      const body = new FormData();
      body.append("file", file);
      body.append("fileName", file.name || `progress-${slot}-${auth.token}`);
      body.append("publicKey", IMAGEKIT_PUBLIC_KEY as string);
      body.append("signature", auth.signature);
      body.append("expire", auth.expire);
      body.append("token", auth.token);
      body.append("folder", "/sofit/progress-photos");

      const response = await fetch("https://upload.imagekit.io/api/v1/files/upload", { method: "POST", body });
      if (!response.ok) throw new Error(`ImageKit responded ${response.status}`);
      const data = (await response.json()) as { url?: string };
      if (!data.url) throw new Error("No URL returned from ImageKit.");
      applySlots({ ...slots, [slot]: { url: data.url, status: "idle" } });
    } catch {
      applySlots({ ...slots, [slot]: { url: slots[slot].url, status: "error" } });
    }
  }

  function onPick(slot: ProgressPhotoSlot, event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) void upload(slot, file);
    event.target.value = "";
  }

  function remove(slot: ProgressPhotoSlot) {
    applySlots({ ...slots, [slot]: { url: "", status: "idle" } });
  }

  const filledCount = PROGRESS_PHOTO_SLOTS.reduce((total, slot) => total + (slots[slot].url ? 1 : 0), 0);
  const slotMeta: Record<ProgressPhotoSlot, { label: string; hint: string }> = {
    front: { label: t("slotFrontLabel"), hint: t("slotFrontHint") },
    side: { label: t("slotSideLabel"), hint: t("slotSideHint") },
    back: { label: t("slotBackLabel"), hint: t("slotBackHint") },
  };

  return (
    <div className="progress-photo-uploader">
      <div className="progress-photo-count" aria-live="polite">
        <span className={filledCount === 3 ? "complete" : ""}>{t("countLabel", { count: filledCount })}</span>
      </div>

      <div className="progress-photo-grid">
        {PROGRESS_PHOTO_SLOTS.map((slot) => {
          const state = slots[slot];
          const meta = slotMeta[slot];
          return (
            <div className="progress-photo-slot" key={slot}>
              <input type="hidden" name={slotInputName(slot)} value={state.url} />
              <button
                type="button"
                className={`progress-photo-tile${state.url ? " has-photo" : ""}${state.status === "error" ? " has-error" : ""}`}
                onClick={() => (state.url ? setZoomed(slot) : fileRefs[slot].current?.click())}
                disabled={state.status === "uploading"}
              >
                {state.url ? (
                  <>
                    <img src={state.url} alt={t("slotAltUploaded", { angle: meta.label })} />
                    <span className="progress-photo-zoom-badge" aria-hidden="true"><ZoomIn size={14} /></span>
                  </>
                ) : (
                  <span className="progress-photo-tile-empty">
                    <Camera size={22} />
                    <strong>{meta.label}</strong>
                    <em>{meta.hint}</em>
                  </span>
                )}
                {state.status === "uploading" ? (
                  <span className="progress-photo-uploading" role="status">
                    <Loader2 size={18} className="spin" /> {t("uploading")}
                  </span>
                ) : null}
              </button>

              <div className="progress-photo-slot-foot">
                <span className="progress-photo-slot-label">{meta.label}</span>
                {state.url ? (
                  <div className="progress-photo-slot-actions">
                    <button type="button" className="icon-button quiet" aria-label={t("retakeCta", { angle: meta.label })} onClick={() => fileRefs[slot].current?.click()}>
                      <RotateCcw size={14} />
                    </button>
                    <button type="button" className="icon-button quiet danger-text" aria-label={t("removeCta", { angle: meta.label })} onClick={() => remove(slot)}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                ) : null}
              </div>
              {state.status === "error" ? <p className="progress-photo-error">{t("uploadFailed")}</p> : null}

              <input
                ref={fileRefs[slot]}
                type="file"
                accept="image/*"
                data-slot={slot}
                hidden
                onChange={(event) => onPick(slot, event)}
              />
            </div>
          );
        })}
      </div>

      {!IMAGEKIT_READY ? <p className="progress-photo-error">{t("notConfigured")}</p> : null}

      <div className="privacy-note">
        <ShieldCheck size={16} />
        <p>
          <strong>{t("privacyTitle")}</strong>
          <span>{t("privacyBody")}</span>
        </p>
      </div>

      {zoomed && slots[zoomed].url ? (
        <PhotoLightbox url={slots[zoomed].url} alt={slotMeta[zoomed].label} onClose={() => setZoomed(null)} />
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------
   Read-only display — used by the coach's check-in review, a client's
   own profile view for the coach, and the client's own progress page.
------------------------------------------------------------------ */

function slotEntries(photos: ProgressPhotos) {
  return PROGRESS_PHOTO_SLOTS.map((slot) => ({ slot, url: photos[slot] }));
}

/** One week's three thumbnails, tap-to-zoom. `size="sm"` is used inside the
 *  timeline strip; the default is used for the primary "this week" display. */
export function ProgressPhotoTrio({
  photos,
  altPrefix,
  size = "md",
  emptyHint,
}: {
  photos: ProgressPhotos;
  altPrefix: string;
  size?: "sm" | "md";
  emptyHint?: string;
}) {
  const t = useTranslations("ProgressPhotos");
  const [zoomed, setZoomed] = useState<ProgressPhotoSlot | null>(null);
  const entries = slotEntries(photos);
  const labels: Record<ProgressPhotoSlot, string> = {
    front: t("slotFrontLabel"),
    side: t("slotSideLabel"),
    back: t("slotBackLabel"),
  };

  if (entries.every((entry) => !entry.url)) {
    return emptyHint ? <p className="progress-photo-empty-hint">{emptyHint}</p> : null;
  }

  return (
    <div className={`progress-photo-trio as-${size}`}>
      {entries.map(({ slot, url }) => (
        <button
          type="button"
          key={slot}
          className={`progress-photo-thumb${url ? "" : " is-empty"}`}
          disabled={!url}
          onClick={() => url && setZoomed(slot)}
        >
          {url ? <img src={url} alt={`${altPrefix} — ${labels[slot]}`} loading="lazy" /> : <span>{labels[slot]}</span>}
          <span className="progress-photo-thumb-label">{labels[slot]}</span>
        </button>
      ))}
      {zoomed && photos[zoomed] ? (
        <PhotoLightbox url={photos[zoomed] as string} alt={`${altPrefix} — ${labels[zoomed]}`} onClose={() => setZoomed(null)} />
      ) : null}
    </div>
  );
}

/** "Then vs. now" pairing for the coach — the highest-value view of this
 *  whole feature, so it gets its own clearly-labeled two-up layout. */
export function ProgressPhotoCompare({
  current,
  currentLabel,
  previous,
  previousLabel,
  altPrefix,
}: {
  current: ProgressPhotos;
  currentLabel: string;
  previous: ProgressPhotos | null;
  previousLabel?: string;
  altPrefix: string;
}) {
  const t = useTranslations("ProgressPhotos");
  const hasCurrent = slotEntries(current).some((entry) => entry.url);
  const hasPrevious = previous ? slotEntries(previous).some((entry) => entry.url) : false;

  if (!hasCurrent && !hasPrevious) {
    return <p className="progress-photo-empty-hint">{t("noPhotosThisCheckIn")}</p>;
  }

  return (
    <div className={`progress-photo-compare${hasPrevious ? " has-previous" : ""}`}>
      {hasPrevious ? (
        <div className="progress-photo-compare-col">
          <span className="progress-photo-compare-label">{previousLabel || t("previousWeekLabel")}</span>
          <ProgressPhotoTrio photos={previous as ProgressPhotos} altPrefix={`${altPrefix} (${previousLabel || t("previousWeekLabel")})`} size="sm" />
        </div>
      ) : (
        <div className="progress-photo-compare-col is-placeholder">
          <span className="progress-photo-compare-label">{t("previousWeekLabel")}</span>
          <p className="progress-photo-empty-hint">{t("noPreviousPhotos")}</p>
        </div>
      )}
      <div className="progress-photo-compare-col">
        <span className="progress-photo-compare-label">{currentLabel}</span>
        {hasCurrent ? (
          <ProgressPhotoTrio photos={current} altPrefix={`${altPrefix} (${currentLabel})`} size="sm" />
        ) : (
          <p className="progress-photo-empty-hint">{t("noPhotosThisCheckIn")}</p>
        )}
      </div>
    </div>
  );
}

/** Horizontal-scroll strip of recent weeks — the client's own photo timeline,
 *  and the compact "recent weeks" view on the coach's client-detail page. */
export function ProgressPhotoTimeline({
  entries,
  altPrefix,
}: {
  entries: Array<{ key: string; weekLabel: string; photos: ProgressPhotos }>;
  altPrefix: string;
}) {
  const visible = entries.filter((entry) => slotEntries(entry.photos).some((slotEntry) => slotEntry.url));
  if (visible.length === 0) return null;

  return (
    <div className="progress-photo-timeline">
      {visible.map((entry) => (
        <div className="progress-photo-timeline-week" key={entry.key}>
          <span className="progress-photo-timeline-date">{entry.weekLabel}</span>
          <ProgressPhotoTrio photos={entry.photos} altPrefix={`${altPrefix} — ${entry.weekLabel}`} size="sm" />
        </div>
      ))}
    </div>
  );
}
