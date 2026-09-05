/** Shared, server-safe helpers for the weekly check-in's three progress photos
 *  (front / side / back). No React here — this is imported from both server
 *  actions/components and the client uploader/viewer components. */

export const PROGRESS_PHOTO_SLOTS = ["front", "side", "back"] as const;
export type ProgressPhotoSlot = (typeof PROGRESS_PHOTO_SLOTS)[number];

export type ProgressPhotos = {
  front: string | null;
  side: string | null;
  back: string | null;
};

export const EMPTY_PROGRESS_PHOTOS: ProgressPhotos = { front: null, side: null, back: null };

/** MySQL JSON columns sometimes come back pre-parsed and sometimes as a raw
 *  string depending on driver config — normalize either shape defensively,
 *  matching the `typeof x === "string" ? JSON.parse(x) : x` pattern already
 *  used for this codebase's other JSON columns (intake_answers, meals, etc). */
export function parseProgressPhotos(value: unknown): ProgressPhotos {
  let raw: unknown = value;
  if (typeof raw === "string" && raw.trim()) {
    try {
      raw = JSON.parse(raw);
    } catch {
      raw = null;
    }
  }
  const obj = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const pick = (key: string) => (typeof obj[key] === "string" && obj[key] ? (obj[key] as string) : null);
  return { front: pick("front"), side: pick("side"), back: pick("back") };
}

export function countProgressPhotos(photos: ProgressPhotos | null | undefined): number {
  if (!photos) return 0;
  return PROGRESS_PHOTO_SLOTS.reduce((total, slot) => total + (photos[slot] ? 1 : 0), 0);
}

export function hasAnyProgressPhoto(photos: ProgressPhotos | null | undefined): boolean {
  return countProgressPhotos(photos) > 0;
}
