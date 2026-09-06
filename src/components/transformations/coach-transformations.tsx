import { Sparkles } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { requireRole } from "@/lib/auth/session";
import { database } from "@/lib/db";
import { Card, PageHeader } from "@/components/dashboard/primitives";
import { TransformationDetail, type TransformationRow } from "./transformation-detail";
import { TransformationList, type TransformationListRow } from "./transformation-list";

function mapRow(row: Record<string, unknown>): TransformationRow {
  return {
    id: Number(row.id),
    displayName: String(row.display_name),
    beforePhotoUrl: row.before_photo_url ? String(row.before_photo_url) : null,
    afterPhotoUrl: row.after_photo_url ? String(row.after_photo_url) : null,
    description: String(row.description || ""),
    isPublished: Boolean(row.is_published),
  };
}

export async function CoachTransformations({ selectedTransformationId }: { selectedTransformationId?: number | null }) {
  await requireRole("coach");

  if (selectedTransformationId) {
    const row = await database()("transformations").where({ id: selectedTransformationId }).first();
    if (!row) {
      const t = await getTranslations("Transformations.detail");
      return (
        <Card className="empty-state">
          <Sparkles size={24} />
          <h3>{t("notFoundTitle")}</h3>
          <p>{t("notFoundHint")}</p>
        </Card>
      );
    }
    return <TransformationDetail item={mapRow(row)} />;
  }

  const t = await getTranslations("Transformations.page");
  const rows = await database()("transformations").orderBy("sort_order", "asc").orderBy("created_at", "desc");
  const transformations: TransformationListRow[] = rows.map(mapRow);

  return (
    <>
      <PageHeader eyebrow={t("eyebrow")} title={t("title")} description={t("description")} />
      <TransformationList transformations={transformations} />
    </>
  );
}
