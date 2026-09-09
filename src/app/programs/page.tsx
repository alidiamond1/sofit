import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, Check, Dumbbell } from "lucide-react";
import {
  ClosingCta,
  ImageFrame,
  MarketingPageShell,
  PrimaryLink,
  ProgramPanel,
  SectionHeading,
  TextLink,
  marketingStyles as styles,
} from "@/components/marketing/marketing-page";
import { coachingProcess, packageCategoryLabels, personalTrainingTiers, programs } from "@/lib/marketing/content";
import { database } from "@/lib/db";

export const metadata: Metadata = {
  title: "Fitness coaching programs & pricing",
  description:
    "Real SoFit pricing: consultation, meal plan, workout plan, and personal training tiers, plus bundled packages for a faster start.",
};

// ponytail: whole-dollar rounding — every seeded price is already a round dollar
// amount, so this is a display simplification, not a data change. Switch to
// minimumFractionDigits: 2 if a coach ever prices something with cents.
const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

function billingNote(interval: string) {
  if (interval === "one_time") return "one-time";
  if (interval === "quarterly") return "per quarter";
  return "per month";
}

type PackageRow = {
  id: number;
  name: string;
  category: string;
  description: string;
  price: number;
  billingInterval: string;
  dietGroupName: string | null;
  workoutGroupName: string | null;
};

async function activePackages(): Promise<PackageRow[]> {
  const rows = await database()("packages")
    .select("packages.*", "diet_groups.name as diet_group_name", "workout_groups.name as workout_group_name")
    .leftJoin("diet_groups", "diet_groups.id", "packages.diet_group_id")
    .leftJoin("workout_groups", "workout_groups.id", "packages.workout_group_id")
    .where({ "packages.is_active": true })
    .orderBy("packages.price", "asc");
  return rows.map((row) => ({
    id: Number(row.id),
    name: String(row.name),
    category: String(row.category),
    description: String(row.description || ""),
    price: Number(row.price),
    billingInterval: String(row.billing_interval),
    dietGroupName: row.diet_group_name ? String(row.diet_group_name) : null,
    workoutGroupName: row.workout_group_name ? String(row.workout_group_name) : null,
  }));
}

export default async function ProgramsPage() {
  const packages = await activePackages();

  return (
    <MarketingPageShell>
      <section className={styles.programHero} aria-labelledby="programs-title">
        <div className={styles.programHeroCopy}>
          <span className={styles.eyebrow}>Your ambition. A plan to match.</span>
          <h1 id="programs-title">Find your rhythm.<br /><em>Build your strength.</em></h1>
          <p>Training, nutrition, and a coach who knows your name. Choose the support that turns your goals into a routine you can keep.</p>
          <div className={styles.heroActions}><PrimaryLink href="#program-list">Find your program</PrimaryLink><TextLink href="/contact?subject=consultation#contact-form">Talk to Coach Ali</TextLink></div>
          <ul className={styles.programHeroBenefits}><li><Check size={16} /> All experience levels</li><li><Check size={16} /> Online coaching</li><li><Check size={16} /> Personal feedback</li></ul>
        </div>
        <div className={styles.programHeroCollage}>
          <div className={styles.programHeroOrbit} aria-hidden="true" />
          <div className={styles.programHeroPhoto}><Image src="/brand/fitness/strength.png" alt="A woman building strength with a kettlebell squat." fill priority sizes="(max-width: 767px) 90vw, 42vw" /></div>
          <div className={styles.programHeroInset}><Image src="/brand/fitness/nutrition.png" alt="A fresh, balanced meal to support training." fill sizes="(max-width: 767px) 38vw, 18vw" /></div>
          <div className={styles.programHeroTag}><Dumbbell size={24} aria-hidden="true" /><div><strong>Made for your life.</strong><span>Training + nutrition + support</span></div></div>
          <span className={styles.programHeroSpark} aria-hidden="true" />
        </div>
      </section>

      <nav className={styles.programJumpLinks} aria-label="Explore coaching services">
        {programs.map((program) => <Link key={program.slug} href={`#${program.slug}`}><span>{program.number}</span><strong>{program.name}</strong><ArrowUpRight size={18} aria-hidden="true" /></Link>)}
      </nav>

      <section id="program-list" className={styles.pageSection}>
        <SectionHeading
          eyebrow="The SoFit programs"
          title={<>Built for real weeks, not perfect ones.</>}
          description="Every path is personal, measurable, and connected to direct coach feedback. The difference is how much structure and support you need."
        />
        <div className={styles.programList}>
          {programs.map((program) => (
            <ProgramPanel key={program.slug} program={program} />
          ))}
        </div>
      </section>

      <section className={`${styles.pageSection} ${styles.pageSectionWide}`}>
        <SectionHeading
          eyebrow="Personal training tiers"
          title={<>One-to-one coaching, shaped around your life.</>}
          description="The standard stays personal. The delivery and level of support change to match your calendar, working style, or performance target."
        />
        <div className={styles.tierGrid}>
          {personalTrainingTiers.map((tier, index) => (
            <article className={styles.tierCard} data-index={String(index + 1).padStart(2, "0")} key={tier.name}>
              <span className={styles.tierMarker}>{tier.marker}</span>
              <h3>{tier.name}</h3>
              <p>{tier.description}</p>
              <TextLink href={`/contact?subject=${encodeURIComponent(tier.name + " personal training")}#contact-form`}>Explore {tier.name}</TextLink>
            </article>
          ))}
        </div>
      </section>

      {packages.length > 0 ? (
        <section id="packages" className={`${styles.pageSection} ${styles.splitSection}`}>
          <ImageFrame
            src="/brand/coach-portrait.jpg"
            alt="Coach Ali between sets in the gym."
            caption="One coach, one method — bundled or à la carte."
            position="78% 22%"
          />
          <div className={styles.splitCopy}>
            <SectionHeading
              eyebrow="A different way to start"
              title={<>Or start with a complete package.</>}
              compact
            />
            <p>
              A package bundles the direction you need — nutrition, training, or personal coaching — into one plan
              and one monthly price, matched to where you are starting from. It is a different purchase from picking
              a single service above: everything is pre-assembled around a level, not a-la-carte.
            </p>
            <div className={styles.packageList}>
              {packages.map((pkg) => (
                <article className={styles.packageRow} key={pkg.id}>
                  <div className={styles.packageRowHead}>
                    <div>
                      <span className={styles.packageCategory}>{packageCategoryLabels[pkg.category] ?? pkg.category}</span>
                      <h3 className={styles.packageName}>{pkg.name}</h3>
                    </div>
                    <div className={styles.packagePrice}>
                      <strong>{money.format(pkg.price)}</strong>
                      <span>{billingNote(pkg.billingInterval)}</span>
                    </div>
                  </div>
                  <TextLink href={`/contact?subject=${encodeURIComponent(pkg.name)}#contact-form`}>Ask about this package</TextLink>
                  {pkg.description ? <p>{pkg.description}</p> : null}
                  {pkg.dietGroupName || pkg.workoutGroupName ? (
                    <div className={styles.packageIncludes}>
                      {pkg.dietGroupName ? <span>{pkg.dietGroupName}</span> : null}
                      {pkg.workoutGroupName ? <span>{pkg.workoutGroupName}</span> : null}
                    </div>
                  ) : null}
                </article>
              ))}
            </div>
            <TextLink href="/contact?subject=packages">Ask which package fits</TextLink>
          </div>
        </section>
      ) : null}

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
