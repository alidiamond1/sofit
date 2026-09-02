import type { Metadata } from "next";
import {
  ClosingCta,
  EditorialHero,
  MarketingPageShell,
  PrimaryLink,
  ProgramPanel,
  SectionHeading,
  TextLink,
  marketingStyles as styles,
} from "@/components/marketing/marketing-page";
import { coachingProcess, personalTrainingTiers, programs } from "@/lib/marketing/content";

export const metadata: Metadata = {
  title: "Fitness coaching programs",
  description:
    "Explore SoFit consultation, diet plan, workout plan, and personal training programs built around your goals and routine.",
};

export default function ProgramsPage() {
  return (
    <MarketingPageShell>
      <EditorialHero
        eyebrow="Choose your coaching path"
        title={<>One goal. The <em>right</em> way in.</>}
        description="Whether you need a clear first decision or close one-to-one coaching, SoFit starts with the service that matches your current reality."
        imageSrc="/brand/training-detail.png"
        imageAlt="A focused strength training session with close coaching guidance."
        imagePosition="center 28%"
        aside={<><span>Four ways to begin</span><span>One coach</span></>}
      >
        <PrimaryLink href="/contact?subject=consultation">Book a consultation</PrimaryLink>
        <TextLink href="#program-list">Compare the programs</TextLink>
      </EditorialHero>

      <section className={`${styles.pageSection} ${styles.pageSectionWide}`}>
        <div className={styles.introBand}>
          <strong>Not every client needs the same level of support.</strong>
          <p>
            A useful program solves the problem in front of you. Start with direction, add a focused nutrition or
            workout plan, or choose personal training when direct feedback and accountability matter most.
          </p>
        </div>
      </section>

      <section id="program-list" className={styles.pageSection}>
        <SectionHeading
          eyebrow="The SoFit programs"
          title={<>Built for real weeks, not perfect ones.</>}
          description="Every path is personal, measurable, and connected to direct coach feedback. The difference is how much structure and support you need."
        />
        <div className={styles.programList}>
          {programs.map((program) => <ProgramPanel key={program.slug} program={program} />)}
        </div>
      </section>

      <section className={`${styles.pageSection} ${styles.pageSectionWide}`}>
        <SectionHeading
          eyebrow="Personal training tiers"
          title={<>One-to-one coaching, shaped around your life.</>}
          description="The standard stays personal. The delivery changes to match your calendar, working style, or performance target."
        />
        <div className={styles.tierGrid}>
          {personalTrainingTiers.map((tier, index) => (
            <article className={styles.tierCard} data-index={String(index + 1).padStart(2, "0")} key={tier.name}>
              <span className={styles.tierMarker}>{tier.marker}</span>
              <h3>{tier.name}</h3>
              <p>{tier.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.pageSection}>
        <SectionHeading
          eyebrow="How coaching moves"
          title={<>A plan that learns with you.</>}
          description="The process stays simple enough to follow and detailed enough to make good decisions."
          compact
        />
        <div className={styles.processGrid}>
          {coachingProcess.map((step) => (
            <article className={styles.processItem} key={step.number}>
              <span>{step.number}</span>
              <h3>{step.title}</h3>
              <p>{step.text}</p>
            </article>
          ))}
        </div>
      </section>

      <ClosingCta
        eyebrow="Unsure where to start?"
        title={<>Start with the conversation.</>}
        text="Tell Coach Ali what you want to change and what your week looks like. The consultation will make the next step clear."
      />
    </MarketingPageShell>
  );
}
