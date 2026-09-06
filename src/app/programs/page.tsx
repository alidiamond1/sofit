import type { Metadata } from "next";
import {
  ClosingCta,
  EditorialHero,
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
    "Real SoFit pricing: consultation, diet plan, workout plan, and personal training tiers, plus bundled packages for a faster start.",
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

type ServiceRow = { type: string; tier: string | null; price: number; billingInterval: string };
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

async function activeServices(): Promise<ServiceRow[]> {
  const rows = await database()("services").where({ is_active: true }).select("type", "tier", "price", "billing_interval");
  return rows.map((row) => ({
    type: String(row.type),
    tier: row.tier ? String(row.tier) : null,
    price: Number(row.price),
    billingInterval: String(row.billing_interval),
  }));
}

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
  const [services, packages] = await Promise.all([activeServices(), activePackages()]);

  const priceByType = new Map<string, ServiceRow>();
  const ptTiersByTier = new Map<string, ServiceRow>();
  for (const service of services) {
    if (service.type === "personal_training" && service.tier) {
      ptTiersByTier.set(service.tier, service);
    } else if (!priceByType.has(service.type)) {
      priceByType.set(service.type, service);
    }
  }
  const ptFromPrice = ptTiersByTier.size > 0 ? Math.min(...[...ptTiersByTier.values()].map((s) => s.price)) : null;

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
            workout plan, or choose personal training when direct feedback and accountability matter most. Every
            service below is priced on its own — or bundled into a package.
          </p>
        </div>
      </section>

      <section id="program-list" className={styles.pageSection}>
        <SectionHeading
          eyebrow="The SoFit programs"
          title={<>Built for real weeks, not perfect ones.</>}
          description="Every path is personal, measurable, and connected to direct coach feedback. The difference is how much structure and support you need — and what it costs."
        />
        <div className={styles.programList}>
          {programs.map((program) => {
            if (program.serviceType === "personal_training") {
              const price = ptFromPrice != null ? { amount: `From ${money.format(ptFromPrice)}`, note: "per month · 3 tiers" } : null;
              return <ProgramPanel key={program.slug} program={program} price={price} />;
            }
            const service = priceByType.get(program.serviceType);
            const price = service ? { amount: money.format(service.price), note: billingNote(service.billingInterval) } : null;
            return <ProgramPanel key={program.slug} program={program} price={price} />;
          })}
        </div>
      </section>

      <section className={`${styles.pageSection} ${styles.pageSectionWide}`}>
        <SectionHeading
          eyebrow="Personal training tiers"
          title={<>One-to-one coaching, shaped around your life.</>}
          description="The standard stays personal. The delivery, price, and level of support change to match your calendar, working style, or performance target."
        />
        <div className={styles.tierGrid}>
          {personalTrainingTiers.map((tier, index) => {
            const service = ptTiersByTier.get(tier.tier);
            return (
              <article className={styles.tierCard} data-index={String(index + 1).padStart(2, "0")} key={tier.name}>
                <span className={styles.tierMarker}>{tier.marker}</span>
                <h3>{tier.name}</h3>
                <p>{tier.description}</p>
                {service ? (
                  <div className={styles.tierPrice}>
                    <strong>{money.format(service.price)}</strong>
                    <span>{billingNote(service.billingInterval)}</span>
                  </div>
                ) : null}
              </article>
            );
          })}
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
