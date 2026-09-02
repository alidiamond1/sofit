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
import { coachingPrinciples, coachingProcess } from "@/lib/marketing/content";

export const metadata: Metadata = {
  title: "About Coach Ali",
  description:
    "Meet Coach Ali and learn how SoFit turns personal goals, honest feedback, and measured progress into sustainable fitness coaching.",
};

export default function AboutPage() {
  return (
    <MarketingPageShell>
      <EditorialHero
        eyebrow="About Coach Ali"
        title={<>Coaching with <em>context.</em></>}
        description="SoFit is personal coaching built around the whole person: your goal, your routine, your starting point, and the life your plan has to work inside."
        imageSrc="/brand/hero.jpg"
        imageAlt="Coach Ali training in a gym."
        imagePosition="center 22%"
        aside={<><span>Coach-led</span><span>Personal by design</span></>}
      >
        <PrimaryLink href="/contact?subject=consultation">Work with Coach Ali</PrimaryLink>
        <TextLink href="/programs">Explore programs</TextLink>
      </EditorialHero>

      <section className={`${styles.pageSection} ${styles.splitSection}`}>
        <div className={styles.splitCopy}>
          <SectionHeading eyebrow="The idea behind SoFit" title={<>Clear direction changes how consistency feels.</>} compact />
          <p>
            Fitness advice is easy to find. Knowing which advice belongs in your week is harder. SoFit was built to close that gap
            with a real intake, a focused plan, and feedback from the same coach who understands why the plan was made.
          </p>
          <p>
            That creates a calmer kind of accountability: you know what matters today, your coach can see what happened,
            and the next adjustment comes from evidence rather than pressure.
          </p>
          <ul className={styles.factList}>
            <li><span>Focus</span><strong>Strength, nutrition, body composition, and performance</strong></li>
            <li><span>Delivery</span><strong>Online planning, direct messaging, check-ins, and coached sessions</strong></li>
            <li><span>Standard</span><strong>Personal decisions, explained clearly and reviewed consistently</strong></li>
          </ul>
        </div>
        <ImageFrame
          src="/brand/training-detail.png"
          alt="Close-up of an athlete training with intention in the gym."
          caption="The work is personal. The standard is consistent."
          position="center 30%"
        />
      </section>

      <section className={styles.pageSection}>
        <SectionHeading
          eyebrow="Coaching principles"
          title={<>Less noise. Better decisions.</>}
          description="SoFit keeps the system focused on what helps you act, learn, and move forward."
        />
        <div className={styles.principlesGrid}>
          {coachingPrinciples.map((principle) => (
            <article className={styles.principleItem} key={principle.number}>
              <span>{principle.number}</span>
              <h3>{principle.title}</h3>
              <p>{principle.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className={`${styles.pageSection} ${styles.splitSection} ${styles.splitSectionReverse}`}>
        <div className={styles.splitCopy}>
          <SectionHeading eyebrow="The working relationship" title={<>A coach who sees the signal and hears the person.</>} compact />
          <p>
            Tracking helps, but numbers never speak without context. Weekly check-ins create space to explain what felt
            strong, what got in the way, and what the program should ask from you next.
          </p>
          <p>
            You get clear expectations, direct answers, and adjustments that protect the larger goal without pretending
            every week will look the same.
          </p>
          <TextLink href="/results">See how progress is measured</TextLink>
        </div>
        <aside className={styles.coachNote}>
          <p>The goal is not a perfect week. It is a system you can return to and keep building.</p>
          <footer>A SoFit coaching principle</footer>
        </aside>
      </section>

      <section className={styles.pageSection}>
        <SectionHeading eyebrow="What to expect" title={<>A simple rhythm, repeated well.</>} compact />
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
        title={<>Your starting point is enough.</>}
        text="Bring the goal, the questions, and the reality of your schedule. Coach Ali will help you turn them into a plan."
      />
    </MarketingPageShell>
  );
}
