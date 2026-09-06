"use client";

/* eslint-disable @next/next/no-img-element */
import { X, ZoomIn } from "lucide-react";
import { useEffect, useState } from "react";
import styles from "./marketing-sections.module.css";

export type GalleryTransformation = {
  id: number;
  displayName: string;
  beforePhotoUrl: string;
  afterPhotoUrl: string;
  description: string;
};

/** Public /results gallery — one editorial "photo beside story" block per
 *  transformation (the same splitSection/splitCopy pattern used elsewhere on
 *  this page), alternating sides, each opening a lightbox with the full-size
 *  before/after pair on click. Same interaction as the dashboard's photo
 *  lightbox (src/components/dashboard/progress-photos.tsx), reimplemented
 *  here with plain CSS + local state since that component is
 *  authenticated-dashboard-only. */
export function TransformationsGallery({ items }: { items: GalleryTransformation[] }) {
  const [openId, setOpenId] = useState<number | null>(null);
  const active = items.find((item) => item.id === openId) || null;

  useEffect(() => {
    if (!active) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpenId(null);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [active]);

  function open(id: number) {
    setOpenId(id);
  }

  return (
    <>
      <div className={styles.transformationStack}>
        {items.map((item, index) => (
          <div
            key={item.id}
            className={`${styles.transformationEntry} ${styles.splitSection}${index % 2 === 1 ? ` ${styles.splitSectionReverse}` : ""}`}
          >
            <button
              type="button"
              className={styles.transformationPhotosButton}
              onClick={() => open(item.id)}
              aria-label={`View ${item.displayName}'s before and after enlarged`}
            >
              <div className={styles.transformationPhotos}>
                <div className={styles.transformationPhoto}>
                  <img src={item.beforePhotoUrl} alt={`${item.displayName} — before`} loading="lazy" />
                  <span>Before</span>
                </div>
                <div className={styles.transformationPhoto}>
                  <img src={item.afterPhotoUrl} alt={`${item.displayName} — after`} loading="lazy" />
                  <span>After</span>
                </div>
                <span className={styles.transformationZoomHint} aria-hidden="true"><ZoomIn size={20} /></span>
              </div>
            </button>
            <div className={styles.splitCopy}>
              <span className={styles.transformationEyebrow}>Before / after</span>
              <div className={styles.transformationCopy}>
                <h3>{item.displayName}</h3>
                {item.description ? <p>{item.description}</p> : null}
              </div>
            </div>
          </div>
        ))}
      </div>

      {active ? (
        <div
          className={styles.transformationLightbox}
          role="dialog"
          aria-modal="true"
          aria-label={`${active.displayName}'s transformation`}
          onClick={() => setOpenId(null)}
        >
          <button type="button" className={styles.transformationLightboxClose} aria-label="Close" onClick={() => setOpenId(null)}>
            <X size={18} />
          </button>
          <div className={styles.transformationLightboxPanel} onClick={(event) => event.stopPropagation()}>
            <div className={styles.transformationLightboxPhotos}>
              <figure>
                <img src={active.beforePhotoUrl} alt={`${active.displayName} — before`} />
                <figcaption>Before</figcaption>
              </figure>
              <figure>
                <img src={active.afterPhotoUrl} alt={`${active.displayName} — after`} />
                <figcaption>After</figcaption>
              </figure>
            </div>
            <div className={styles.transformationLightboxInfo}>
              <h3>{active.displayName}</h3>
              {active.description ? <p>{active.description}</p> : null}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
