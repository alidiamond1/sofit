"use client";

/* eslint-disable @next/next/no-img-element */
import { X, ZoomIn } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import type { TransformationStory } from "@/lib/transformation";
import styles from "./marketing-sections.module.css";

export type GalleryTransformation = {
  id: number; displayName: string; beforePhotoUrl: string; afterPhotoUrl: string; description: string; story: TransformationStory;
};

function PhotoLightbox({ item, onClose }: { item: GalleryTransformation; onClose: () => void }) {
  const t = useTranslations("Transformations.public");
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    dialog.current?.showModal();
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previous; };
  }, []);
  return <dialog ref={dialog} className={styles.transformationLightbox} aria-label={t("transformationAria", { name: item.displayName })} onCancel={onClose} onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <div className={styles.transformationLightboxPanel}>
      <button type="button" className={styles.transformationLightboxClose} aria-label={t("closePhotos")} onClick={onClose}><X size={18} /></button>
      <div className={styles.transformationLightboxPhotos}>
        <figure><img src={item.beforePhotoUrl} alt={t("beforeAlt", { name: item.displayName })} /><figcaption>{t("before")}</figcaption></figure>
        <figure><img src={item.afterPhotoUrl} alt={t("afterAlt", { name: item.displayName })} /><figcaption>{t("after")}</figcaption></figure>
      </div>
      <div className={styles.transformationLightboxInfo}><h3>{item.displayName}</h3>{item.description ? <p>{item.description}</p> : null}</div>
    </div>
  </dialog>;
}

export function TransformationsGallery({ items }: { items: GalleryTransformation[] }) {
  const t = useTranslations("Transformations.public");
  const [active, setActive] = useState<GalleryTransformation | null>(null);
  return <>
    <div className={styles.transformationStack}>
      {items.map((item) => (
        <article key={item.id} className={`${styles.transformationEntry} ${styles.splitSection}`} aria-labelledby={`transformation-${item.id}`}>
          <button type="button" className={styles.transformationPhotosButton} onClick={() => setActive(item)} aria-label={t("enlargeAria", { name: item.displayName })}>
            <div className={styles.transformationPhotos}>
              <div className={styles.transformationPhoto}><img src={item.beforePhotoUrl} alt={t("beforeAlt", { name: item.displayName })} loading="lazy" /><span>{t("before")}</span></div>
              <div className={styles.transformationPhoto}><img src={item.afterPhotoUrl} alt={t("afterAlt", { name: item.displayName })} loading="lazy" /><span>{t("after")}</span></div>
              <span className={styles.transformationZoomHint} aria-hidden="true"><ZoomIn size={20} /></span>
            </div>
          </button>
          <div className={styles.splitCopy}>
            <span className={styles.transformationEyebrow}>{item.story.headline ? item.displayName : t("clientTransformation")}</span>
            <div className={styles.transformationCopy}>
              <h2 id={`transformation-${item.id}`}>{item.story.headline || item.displayName}</h2>
              {item.description ? <p>{item.description}</p> : null}
            </div>
            {item.story.program || item.story.durationWeeks ? <div className={styles.transformationMeta}>{item.story.program ? <span>{item.story.program}</span> : null}{item.story.durationWeeks ? <span>{t("weeks", { count: item.story.durationWeeks })}</span> : null}</div> : null}
            {item.story.weightBefore != null || item.story.weightAfter != null || item.story.bodyFatBefore != null || item.story.bodyFatAfter != null ? <dl className={styles.transformationMetrics}>
              {item.story.weightBefore != null || item.story.weightAfter != null ? <div><dt>{t("weight")}</dt><dd><span>{t("before")}</span>{item.story.weightBefore != null ? `${item.story.weightBefore} kg` : "—"}</dd><dd><span>{t("after")}</span>{item.story.weightAfter != null ? `${item.story.weightAfter} kg` : "—"}</dd></div> : null}
              {item.story.bodyFatBefore != null || item.story.bodyFatAfter != null ? <div><dt>{t("bodyFat")}</dt><dd><span>{t("before")}</span>{item.story.bodyFatBefore != null ? `${item.story.bodyFatBefore}%` : "—"}</dd><dd><span>{t("after")}</span>{item.story.bodyFatAfter != null ? `${item.story.bodyFatAfter}%` : "—"}</dd></div> : null}
            </dl> : null}
          </div>
        </article>
      ))}
    </div>
    {active ? <PhotoLightbox item={active} onClose={() => setActive(null)} /> : null}
  </>;
}
