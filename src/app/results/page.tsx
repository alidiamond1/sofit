import type { Metadata } from "next";
import {
  ClosingCta,
  EditorialHero,
  ImageFrame,
  MarketingPageShell,
  PrimaryLink,
  SectionHeading,
  TextLink,
  marketingStyles as styles,
} from "@/components/marketing/marketing-page";
import { TransformationsGallery, type GalleryTransformation } from "@/components/marketing/transformations-gallery";
import { progressSignals } from "@/lib/marketing/content";
import { database } from "@/lib/db";

async function publishedTransformations(): Promise<GalleryTransformation[]> {
  const rows = await database()("transformations")
    .where({ is_published: true })
    .orderBy("sort_order", "asc")
    .orderBy("created_at", "desc");
  return rows.map((row) => ({
    id: Number(row.id),
    displayName: String(row.display_name),
    beforePhotoUrl: String(row.before_photo_url),
    afterPhotoUrl: String(row.after_photo_url),
    description: String(row.description || ""),
  }));
}

export const metadata: Metadata = {
  title: "How progress is measured",
  description:
    "See how SoFit measures sustainable fitness progress through consistency, performance, body trends, and confident decision-making.",
};

const reviewRhythm = [
  "Start with a clear baseline: goals, training history, schedule, preferences, and the metrics that matter for your program.",
  "Track the work with workout completion, nutrition adherence, session notes, and weekly check-ins.",
  "Review trends over time, including strength, conditioning, body measurements, weight, photos, recovery, and confidence.",
  "Adjust the plan with context so progress continues without chasing noise from one difficult day or one strong session.",
];

export default async function ResultsPage() {
  const transformations = await publishedTransformations();

  return (
    <MarketingPageShell>
      <EditorialHero
        eyebrow="Progress, made visible"
        title={<>Results you can <em>read.</em></>}
        description="SoFit measures more than a finish photo. The work, the trend, and the confidence behind the result all matter."
        imageSrc="/brand/training-detail.png"
        imageAlt="An athlete working through a focused strength training session."
        imagePosition="center 34%"
        aside={<><span>Track the work</span><span>Understand the trend</span></>}
      >
        <PrimaryLink href="/contact?subject=consultation">Define your goal</PrimaryLink>
        <TextLink href="#signals">How progress is tracked</TextLink>
      </EditorialHero>

      <section id="signals" className={styles.pageSection}>
        <SectionHeading
          eyebrow="Four useful signals"
          title={<>A result is bigger than one number.</>}
          description="The right measures depend on your goal. Together, these signals show whether the program is working and what should change next."
        />
        <div className={styles.signalGrid}>
          {progressSignals.map((signal) => (
            <article className={styles.signalCard} key={signal.label}>
              <span className={styles.signalLabel}>{signal.label}</span>
              <h3>{signal.title}</h3>
              <p>{signal.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className={`${styles.pageSection} ${styles.pageSectionWide}`}>
        <div className={styles.resultsManifesto}>
          <h2>Proof before hype.</h2>
          <p>
            SoFit does not invent transformation numbers or promise identical outcomes. Progress is documented through
            your own baseline, consistent check-ins, and changes that can be explained.
          </p>
        </div>
      </section>

      <section className={`${styles.pageSection} ${styles.splitSection}`}>
        <ImageFrame
          src="/brand/hero.jpg"
          alt="Coach Ali training with focus in a gym."
          caption="The result begins with repeatable work."
          position="center 20%"
        />
        <div className={styles.splitCopy}>
          <SectionHeading eyebrow="The review rhythm" title={<>Measure. Understand. Adjust.</>} compact />
          <p>
            Good tracking should reduce confusion, not create more of it. Your dashboard keeps the useful evidence in
            one place so every review connects the plan to what actually happened.
          </p>
          <ol className={styles.measurementList}>
            {reviewRhythm.map((item) => <li key={item}>{item}</li>)}
          </ol>
        </div>
      </section>

      <section className={styles.pageSection}>
        <div className={styles.introBand}>
          <strong>Photos can show change. Coaching should explain it.</strong>
          <div>
            <p>
              Client photos and body metrics stay personal. When transformations are shared, they should be used with
              permission and enough context to respect the person behind the result.
            </p>
            <div className={styles.inlineLink}>
              <TextLink href="https://www.tiktok.com/@sofit.so">See SoFit on TikTok</TextLink>
            </div>
          </div>
        </div>
      </section>

      {transformations.length > 0 ? (
        <section id="transformations" className={styles.pageSection}>
          <SectionHeading
            eyebrow="Before and after"
            title={<>Real clients. Real work.</>}
            description="A running gallery of transformations built with clients over time, shared with their permission."
          />
          <TransformationsGallery items={transformations} />
        </section>
      ) : null}

      <ClosingCta
        eyebrow="Build your own baseline"
        title={<>Make the next result yours.</>}
        text="Start with an honest assessment and a plan designed to produce progress you can understand and repeat."
      />
    </MarketingPageShell>
  );
}
