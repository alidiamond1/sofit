"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/auth/session";
import { database } from "@/lib/db";

export type TransformationActionState = { error?: string; success?: string };

const recordIdSchema = z.coerce.number().int().positive();
const photoUrlField = z.union([z.literal(""), z.string().trim().url()]).optional();

const transformationSchema = z.object({
  displayName: z.string().trim().min(2, "Client name is required.").max(120),
  beforePhotoUrl: photoUrlField,
  afterPhotoUrl: photoUrlField,
  description: z.string().trim().max(2000).optional(),
  isPublished: z.enum(["true", "false"]),
});

function transformationInput(formData: FormData) {
  return transformationSchema.safeParse({
    displayName: formData.get("display_name"),
    beforePhotoUrl: formData.get("before_photo_url") || "",
    afterPhotoUrl: formData.get("after_photo_url") || "",
    description: formData.get("description") || "",
    isPublished: formData.get("is_published") || "false",
  });
}

function refreshTransformationViews() {
  revalidatePath("/coach/transformations");
  revalidatePath("/results");
}

/** "Add transformation" — creates a nameless draft with no photos yet and sends
 *  the coach straight to its detail view to fill everything in. A draft can be
 *  saved and revisited any number of times before it's ever published. */
export async function createDraftTransformationAction() {
  await requireRole("coach");
  const db = database();
  const { total } = (await db("transformations").max({ total: "sort_order" }).first()) as { total: number | null };
  const [id] = await db("transformations").insert({
    display_name: "New transformation",
    before_photo_url: null,
    after_photo_url: null,
    description: null,
    is_published: false,
    sort_order: Number(total || 0) + 1,
  });
  refreshTransformationViews();
  redirect(`/coach/transformations?transformation=${id}`);
}

export async function updateTransformationAction(
  _previous: TransformationActionState,
  formData: FormData,
): Promise<TransformationActionState> {
  await requireRole("coach");
  const id = recordIdSchema.safeParse(formData.get("id"));
  const parsed = transformationInput(formData);
  if (!id.success) return { error: "The selected transformation is invalid." };
  if (!parsed.success) return { error: parsed.error.issues[0]?.message || "Check the transformation details." };

  const db = database();
  const record = await db("transformations").select("id").where({ id: id.data }).first();
  if (!record) return { error: "This transformation no longer exists." };

  // The edit form only ever carries the transformation's *current* publish state
  // (publishing itself is a separate action) — but if this edit just cleared a
  // photo that was backing a published entry, quietly unpublish rather than
  // block the content edit or leave an incomplete entry live on the results page.
  const stillHasBothPhotos = Boolean(parsed.data.beforePhotoUrl) && Boolean(parsed.data.afterPhotoUrl);
  const isPublished = parsed.data.isPublished === "true" && stillHasBothPhotos;

  await db("transformations").where({ id: id.data }).update({
    display_name: parsed.data.displayName,
    before_photo_url: parsed.data.beforePhotoUrl || null,
    after_photo_url: parsed.data.afterPhotoUrl || null,
    description: parsed.data.description || null,
    is_published: isPublished,
    updated_at: db.fn.now(),
  });
  refreshTransformationViews();
  return { success: `${parsed.data.displayName}'s transformation was saved.` };
}

export async function togglePublishTransformationAction(
  _previous: TransformationActionState,
  formData: FormData,
): Promise<TransformationActionState> {
  await requireRole("coach");
  const id = recordIdSchema.safeParse(formData.get("id"));
  if (!id.success) return { error: "The selected transformation is invalid." };

  const db = database();
  const record = await db("transformations")
    .select("id", "display_name", "is_published", "before_photo_url", "after_photo_url")
    .where({ id: id.data })
    .first();
  if (!record) return { error: "This transformation no longer exists." };

  const nextPublished = !record.is_published;
  if (nextPublished && (!record.before_photo_url || !record.after_photo_url)) {
    return { error: "Upload both a before and after photo before publishing this transformation." };
  }

  await db("transformations").where({ id: id.data }).update({ is_published: nextPublished, updated_at: db.fn.now() });
  refreshTransformationViews();
  return { success: nextPublished ? `${record.display_name} is now visible on the results page.` : `${record.display_name} was hidden from the results page.` };
}

export async function deleteTransformationAction(
  _previous: TransformationActionState,
  formData: FormData,
): Promise<TransformationActionState> {
  await requireRole("coach");
  const id = recordIdSchema.safeParse(formData.get("id"));
  if (!id.success) return { error: "The selected transformation is invalid." };

  const db = database();
  const record = await db("transformations").select("id", "display_name").where({ id: id.data }).first();
  if (!record) return { error: "This transformation no longer exists." };

  await db("transformations").where({ id: id.data }).del();
  refreshTransformationViews();
  redirect("/coach/transformations");
}
