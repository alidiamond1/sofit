import type { Metadata } from "next";
import { MarketingPageShell } from "@/components/marketing/marketing-page";
import { TransformationsGallery } from "@/components/marketing/transformations-gallery";
import { getTranslations } from "next-intl/server";
import { database } from "@/lib/db";
import { parseTransformationStory } from "@/lib/transformation";
import styles from "@/components/marketing/marketing-sections.module.css";

export const metadata: Metadata = {
  title: "Client transformations",
  description: "Explore SoFit client transformations: before and after photos, personal stories, and recorded results.",
};

export default async function ResultsPage() {
  const t = await getTranslations("Transformations.public");
  const rows = await database()("transformations")
    .where({ is_published: true })
    .whereNotNull("before_photo_url").whereNotNull("after_photo_url")
    .whereNot("before_photo_url", "").whereNot("after_photo_url", "")
    .orderBy("sort_order", "asc").orderBy("created_at", "desc");
  const transformations = rows.map((row) => ({
    id: Number(row.id), displayName: String(row.display_name),
    beforePhotoUrl: String(row.before_photo_url), afterPhotoUrl: String(row.after_photo_url),
    description: String(row.description || ""), story: parseTransformationStory(row.story_details),
  }));

  return (
    <MarketingPageShell>
      <section id="transformations" className={styles.resultsPage}>
        <header className={styles.resultsHeading}>
          <span className={styles.transformationEyebrow}>{t("eyebrow")}</span>
          <h1>{t("title")}</h1>
        </header>
        {transformations.length ? <TransformationsGallery items={transformations} /> : (
          <div className={styles.resultsEmpty}><h2>{t("emptyTitle")}</h2><p>{t("emptyHint")}</p></div>
        )}
      </section>
    </MarketingPageShell>
  );
}
