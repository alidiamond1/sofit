"use server";

import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
import { z } from "zod";
import { requireRole } from "@/lib/auth/session";
import { database } from "@/lib/db";
import { parseTransformationStory, transformationSchema } from "@/lib/transformation";

export type TransformationActionState = { error?: string; success?: string };
const recordIdSchema = z.coerce.number().int().positive();

function validationKey(error: z.ZodError) {
  const field = error.issues[0]?.path[0];
  return field === "photos" ? "photosRequired" : field === "consent" ? "consentRequired" : "invalidDetails";
}

function refreshTransformationViews() {
  revalidatePath("/coach/transformations");
  revalidatePath("/results");
}

export async function saveTransformationAction(_previous: TransformationActionState, formData: FormData): Promise<TransformationActionState> {
  await requireRole("coach");
  const t = await getTranslations("Transformations.errors");
  const rawId = formData.get("id");
  const id = rawId ? recordIdSchema.safeParse(rawId) : null;
  if (id && !id.success) return { error: t("invalidRecord") };
  const parsed = transformationSchema.safeParse({
    displayName: formData.get("display_name"),
    beforePhotoUrl: formData.get("before_photo_url") || "",
    afterPhotoUrl: formData.get("after_photo_url") || "",
    description: formData.get("description") || "",
    isPublished: formData.get("is_published") === "true",
    story: {
      headline: formData.get("headline") || "", program: formData.get("program") || "",
      durationWeeks: formData.get("durationWeeks"),
      weightBefore: formData.get("weightBefore"), weightAfter: formData.get("weightAfter"),
      bodyFatBefore: formData.get("bodyFatBefore"), bodyFatAfter: formData.get("bodyFatAfter"),
      consent: formData.get("consent") === "on",
    },
  });
  if (!parsed.success) return { error: t(validationKey(parsed.error)) };
  const db = database();
  const record = {
    display_name: parsed.data.displayName, before_photo_url: parsed.data.beforePhotoUrl || null,
    after_photo_url: parsed.data.afterPhotoUrl || null, description: parsed.data.description || null,
    is_published: parsed.data.isPublished, story_details: JSON.stringify(parsed.data.story), updated_at: db.fn.now(),
  };
  try {
    if (id?.success) {
      const existing = await db("transformations").select("id").where({ id: id.data }).first();
      if (!existing) return { error: t("missing") };
      await db("transformations").where({ id: id.data }).update(record);
    } else {
      const last = await db("transformations").max({ total: "sort_order" }).first();
      await db("transformations").insert({ ...record, sort_order: Number(last?.total || 0) + 1 });
    }
  } catch {
    return { error: t("saveFailed") };
  }
  refreshTransformationViews();
  return { success: t("saved") };
}

export async function togglePublishTransformationAction(_previous: TransformationActionState, formData: FormData): Promise<TransformationActionState> {
  await requireRole("coach");
  const t = await getTranslations("Transformations.errors");
  const id = recordIdSchema.safeParse(formData.get("id"));
  if (!id.success) return { error: t("invalidRecord") };
  const db = database();
  const record = await db("transformations").where({ id: id.data }).first();
  if (!record) return { error: t("missing") };
  const nextPublished = !record.is_published;
  if (nextPublished) {
    const result = transformationSchema.safeParse({
      displayName: record.display_name, beforePhotoUrl: record.before_photo_url || "", afterPhotoUrl: record.after_photo_url || "",
      description: record.description || "", isPublished: true, story: parseTransformationStory(record.story_details),
    });
    if (!result.success) return { error: t(validationKey(result.error)) };
  }
  try {
    await db("transformations").where({ id: id.data }).update({ is_published: nextPublished, updated_at: db.fn.now() });
  } catch {
    return { error: t("publishFailed") };
  }
  refreshTransformationViews();
  return { success: nextPublished ? t("published") : t("hidden") };
}

export async function deleteTransformationAction(_previous: TransformationActionState, formData: FormData): Promise<TransformationActionState> {
  await requireRole("coach");
  const t = await getTranslations("Transformations.errors");
  const id = recordIdSchema.safeParse(formData.get("id"));
  if (!id.success) return { error: t("invalidRecord") };
  try {
    await database()("transformations").where({ id: id.data }).del();
  } catch {
    return { error: t("deleteFailed") };
  }
  refreshTransformationViews();
  return { success: t("deleted") };
}
