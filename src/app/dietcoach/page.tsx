/* eslint-disable @next/next/no-img-element */
import { CheckCircle2, Salad, ShieldCheck, Sparkles, Utensils } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { LandingFooter } from "@/components/landing/landing-footer";
import { LandingNavbar } from "@/components/landing/landing-navbar";
import { readSession } from "@/lib/auth/session";
import { database } from "@/lib/db";

type Tier = "beginner" | "silver" | "gold";
type TierStats = { meals: number; workoutDays: number; exercises: number; built: boolean };
type TierPricing = { price: number; billingInterval: string } | null;

const TRUST_POINTS = ["Personalized macro & calorie targets", "Real meals, not a generic template", "Adjusted as your progress comes in"];

const TIERS: Array<{ tier: Tier; name: string; blurb: string; features: Array<{ title: string; detail: string }> }> = [
  {
    tier: "beginner",
    name: "Beginner",
    blurb: "A simple starting package with an assessment and a guided nutrition plan to build the habit.",
    features: [
      { title: "Personalized nutrition plan", detail: "Built around your goals, schedule, and food preferences." },
      { title: "Meal & food-swap library", detail: "Swap any meal without losing the structure of your plan." },
      { title: "Weekly check-in reviews", detail: "Your coach reviews your progress and adjusts what's not working." },
    ],
  },
  {
    tier: "silver",
    name: "Silver",
    blurb: "A fuller day-by-day nutrition plan paired with training, for clients ready for more structure.",
    features: [
      { title: "Full day-by-day plan", detail: "Diet and training built together, one full week at a time." },
      { title: "One-on-one consultation", detail: "Direct time with your coach to fine-tune the plan to you." },
      { title: "Progress tracking reports", detail: "Adherence and results tracked, not guessed at." },
    ],
  },
  {
    tier: "gold",
    name: "Gold",
    blurb: "The complete nutrition and training build — closest coach involvement, most detail.",
    features: [
      { title: "Complete nutrition & training build", detail: "The most detailed plan, matched to your full training load." },
      { title: "Direct coach messaging", detail: "Ask questions anytime — real answers, not a support queue." },
      { title: "Monthly coaching call", detail: "A real conversation to review progress and adjust ahead." },
    ],
  },
];

async function fetchTierStats(): Promise<Record<Tier, TierStats>> {
  const stats: Record<Tier, TierStats> = {
    beginner: { meals: 0, workoutDays: 0, exercises: 0, built: false },
    silver: { meals: 0, workoutDays: 0, exercises: 0, built: false },
    gold: { meals: 0, workoutDays: 0, exercises: 0, built: false },
  };
  try {
    const rows = await database()("tier_packages").select("tier", "days");
    for (const row of rows) {
      const tier = row.tier as Tier;
      if (!(tier in stats)) continue;
      const days: Array<{ meals?: unknown[]; exercises?: unknown[] }> = Array.isArray(row.days) ? row.days : [];
      const meals = days.reduce((sum, day) => sum + (day.meals?.length || 0), 0);
      const exercises = days.reduce((sum, day) => sum + (day.exercises?.length || 0), 0);
      const workoutDays = days.filter((day) => (day.exercises?.length || 0) > 0).length;
      stats[tier] = { meals, workoutDays, exercises, built: days.length > 0 };
    }
  } catch {
    // Marketing page should never fail to render because the tier data couldn't load.
  }
  return stats;
}

// Only "beginner" has a real priced package today (packages.category has no
// "silver"/"gold" option yet) — show it where it's real, never invent the rest.
async function fetchBeginnerPricing(): Promise<TierPricing> {
  try {
    const row = await database()("packages").where({ is_active: true, category: "beginner" }).select("price", "billing_interval").first();
    if (!row) return null;
    return { price: Number(row.price), billingInterval: String(row.billing_interval) };
  } catch {
    return null;
  }
}

export default async function DietCoachPage() {
  const session = await readSession();
  if (session) redirect(session.role === "coach" ? "/coach" : "/client");

  const [tierStats, beginnerPricing] = await Promise.all([fetchTierStats(), fetchBeginnerPricing()]);
  const tierPricing: Record<Tier, TierPricing> = { beginner: beginnerPricing, silver: null, gold: null };

  return (
    <main className="lp">
      <LandingNavbar />

      <div className="lp-dietcoach-hero">
        <img
          src="https://images.pexels.com/photos/36115189/pexels-photo-36115189.jpeg?auto=compress&cs=tinysrgb&w=1920"
          alt="Portioned meal-prep trays with pasta, vegetables, and lean protein."
          className="lp-dietcoach-hero-bg"
        />
        <div className="lp-dietcoach-hero-overlay" aria-hidden="true" />

        <section className="lp-page-hero">
          <span className="lp-eyebrow">
            <Sparkles size={14} /> Diet Coach
          </span>
          <h1>Flexible meal plans to fit your lifestyle.</h1>
          <p>
            Every plan is built around your real schedule and food preferences — not a generic sheet of “eat this, not
            that.”
          </p>
          <div className="lp-page-hero-trust">
            {TRUST_POINTS.map((point) => (
              <span key={point}>
                <CheckCircle2 size={16} /> {point}
              </span>
            ))}
          </div>
        </section>

        <section id="tiers" className="lp-section lp-tiers">
          <div className="lp-tiers-grid">
            {TIERS.map((tier, index) => {
              const stats = tierStats[tier.tier];
              const pricing = tierPricing[tier.tier];
              return (
                <article key={tier.tier} className={`lp-tier-card${index === 1 ? " is-featured" : ""}`}>
                  <span className="lp-tier-number">{String(index + 1).padStart(2, "0")}</span>
                  <span className="lp-tier-icon">
                    <Utensils size={20} />
                  </span>
                  <h3>{tier.name}</h3>
                  <p>{tier.blurb}</p>
                  <ul className="lp-tier-features">
                    {tier.features.map((feature) => (
                      <li key={feature.title}>
                        <CheckCircle2 size={15} />
                        <span>
                          <strong>{feature.title}</strong>
                          <small>{feature.detail}</small>
                        </span>
                      </li>
                    ))}
                    {stats.built ? (
                      <li>
                        <CheckCircle2 size={15} />
                        <span>
                          <strong>Ready to follow</strong>
                          <small>
                            {stats.meals} meals across {stats.workoutDays} training days, {stats.exercises} exercises
                            included.
                          </small>
                        </span>
                      </li>
                    ) : (
                      <li>
                        <ShieldCheck size={15} />
                        <span>
                          <strong>Built after your consultation</strong>
                          <small>Your coach builds this week-by-week plan with you, not before.</small>
                        </span>
                      </li>
                    )}
                  </ul>
                  <div className="lp-tier-price">
                    {pricing ? (
                      <>
                        <strong>${pricing.price.toFixed(0)}</strong>
                        <span>/ {pricing.billingInterval}</span>
                      </>
                    ) : (
                      <strong className="lp-tier-price-contact">Contact for pricing</strong>
                    )}
                  </div>
                  <Link href="/login" className="lp-tier-cta">
                    Get Started
                  </Link>
                </article>
              );
            })}
          </div>
        </section>
      </div>

      <section className="lp-section lp-why">
        <div className="lp-why-media">
          <img
            src="https://images.pexels.com/photos/36115189/pexels-photo-36115189.jpeg?auto=compress&cs=tinysrgb&w=1200"
            alt="Portioned meal-prep trays with pasta, vegetables, and lean protein."
            loading="lazy"
          />
          <div className="lp-why-media-overlay" aria-hidden="true" />
        </div>
        <div className="lp-why-copy">
          <span className="lp-eyebrow">How it works</span>
          <h2>Nutrition that adjusts to your real life.</h2>
          <div className="lp-why-list">
            <div className="lp-why-item">
              <span className="lp-why-icon">
                <Salad size={18} />
              </span>
              <div>
                <h3>Built from your intake</h3>
                <p>Your calorie and macro targets come from your actual consultation — not a generic calculator.</p>
              </div>
            </div>
            <div className="lp-why-item">
              <span className="lp-why-icon">
                <Utensils size={18} />
              </span>
              <div>
                <h3>Real meals, food swaps included</h3>
                <p>A meal library with swaps means you can adjust a day without losing the plan.</p>
              </div>
            </div>
            <div className="lp-why-item">
              <span className="lp-why-icon">
                <CheckCircle2 size={18} />
              </span>
              <div>
                <h3>Downloadable, always with you</h3>
                <p>Every plan is a PDF you can open anytime, on or offline.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="lp-closing">
        <img
          src="https://images.pexels.com/photos/2261477/pexels-photo-2261477.jpeg?auto=compress&cs=tinysrgb&w=1200"
          alt="A lifter performing a barbell deadlift on a gym platform."
          loading="lazy"
          className="lp-closing-img"
        />
        <div className="lp-closing-overlay" aria-hidden="true" />
        <div className="lp-closing-content">
          <h2>Start with a consultation, not a guess.</h2>
          <Link href="/login" className="lp-cta">
            Book a Consultation
          </Link>
        </div>
      </section>

      <LandingFooter />
    </main>
  );
}
