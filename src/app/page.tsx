/* eslint-disable @next/next/no-img-element */
import {
  Activity,
  ArrowUpRight,
  BarChart3,
  Briefcase,
  CalendarCheck,
  CheckCircle2,
  ClipboardList,
  Dumbbell,
  FileDown,
  MessageCircle,
  NotebookPen,
  Quote,
  Sparkles,
  Trophy,
  Users,
  Utensils,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { LandingFooter } from "@/components/landing/landing-footer";
import { LandingNavbar } from "@/components/landing/landing-navbar";
import { readSession } from "@/lib/auth/session";
import { database } from "@/lib/db";

type TierCategory = "elite" | "business" | "athlete";
type TierPricing = { price: number; billingInterval: string } | null;

const SERVICES = [
  {
    icon: ClipboardList,
    title: "Consultation",
    description:
      "Start with a conversation, not a questionnaire. A real intake call and assessment where your coach learns your goals, your schedule, and where you're starting from — before anything gets built.",
    image: {
      src: "https://images.pexels.com/photos/39219660/pexels-photo-39219660.jpeg?auto=compress&cs=tinysrgb&w=1200",
      alt: "A trainer and client having a focused conversation about a training plan.",
    },
  },
  {
    icon: Utensils,
    title: "Diet Plan",
    description:
      "A nutrition plan built around your calorie and macro targets, with a meal library and food swaps so it actually fits your life. Delivered as a plan you can open anytime and download as a PDF.",
    image: {
      src: "https://images.pexels.com/photos/36115189/pexels-photo-36115189.jpeg?auto=compress&cs=tinysrgb&w=1200",
      alt: "Portioned meal-prep trays with pasta, vegetables, and lean protein.",
    },
  },
  {
    icon: Dumbbell,
    title: "Workout Plan",
    description:
      "A training program designed around your goals — sets, reps, and weekly structure laid out clearly, with an exercise library so you always know exactly what to do and how.",
    image: {
      src: "https://images.pexels.com/photos/18060078/pexels-photo-18060078.jpeg?auto=compress&cs=tinysrgb&w=1200",
      alt: "A person lifting dumbbells during a strength-training session in a gym.",
    },
  },
  {
    icon: Users,
    title: "Personal Training",
    description:
      "One-on-one coaching across three tiers — Elite, Business, and Athlete — with session logs, attendance, and progression tracked so you can see the work adding up.",
    image: {
      src: "https://images.pexels.com/photos/33846716/pexels-photo-33846716.jpeg?auto=compress&cs=tinysrgb&w=1200",
      alt: "A personal trainer spotting and guiding a client through a dumbbell exercise.",
    },
  },
];

const TRUST_POINTS = [
  { icon: NotebookPen, label: "Custom Plans" },
  { icon: MessageCircle, label: "Direct Messaging" },
  { icon: CalendarCheck, label: "Weekly Check-ins" },
  { icon: FileDown, label: "PDF Downloads" },
];

const STEPS = [
  {
    icon: CalendarCheck,
    title: "Book a consultation",
    description: "Tell your coach where you're starting and where you want to go — the first step is a real conversation, not a form.",
  },
  {
    icon: NotebookPen,
    title: "Get your custom plan",
    description: "Your coach builds a diet plan, workout plan, or training program around what came out of that consultation — nothing generic, nothing off-the-shelf.",
  },
  {
    icon: Activity,
    title: "Train and track",
    description: "Follow your plan day to day, log your sessions, and watch your progress take shape in your dashboard.",
  },
  {
    icon: CheckCircle2,
    title: "Check in every week",
    description: "Submit your weekly stats and photos, and get direct feedback from your coach — so every next step stays clear.",
  },
];

const WHY_SOFIT = [
  {
    icon: NotebookPen,
    title: "Built from a real intake, not a template",
    description: "Your diet and workout plans come out of an actual consultation — meals, macros, sets, and reps built around what you told your coach, not a generic starting point.",
  },
  {
    icon: BarChart3,
    title: "Progress tracked, not guessed at",
    description: "Workout completion and diet adherence are logged as you go, so you and your coach both see exactly where things stand — no end-of-month surprises.",
  },
  {
    icon: MessageCircle,
    title: "Direct feedback, every week",
    description: "Weekly check-ins get real feedback from the person who built your plan, through in-app messaging — not an automated summary.",
  },
];

const WHY_SOFIT_IMAGE = {
  src: "https://images.pexels.com/photos/2261477/pexels-photo-2261477.jpeg?auto=compress&cs=tinysrgb&w=1200",
  alt: "A lifter performing a barbell deadlift on a gym platform.",
};

const STATS = [
  { value: "4", label: "Core Services" },
  { value: "3", label: "Training Tiers" },
  { value: "1-on-1", label: "Coaching" },
  { value: "Weekly", label: "Check-ins" },
];

const COACH_IMAGE = {
  src: "https://images.pexels.com/photos/33846716/pexels-photo-33846716.jpeg?auto=compress&cs=tinysrgb&w=1200",
  alt: "A personal trainer spotting and guiding a client through a dumbbell exercise.",
};

const COACH_POINTS = [
  "Builds every diet and workout plan personally",
  "Reviews every weekly check-in",
  "Answers messages directly — no support queue",
];

const TIERS: Array<{ icon: typeof Zap; name: string; category: TierCategory; description: string }> = [
  {
    icon: Zap,
    name: "Elite",
    category: "elite",
    description: "Priority scheduling that puts your sessions first, built for clients who need consistency on a tight calendar.",
  },
  {
    icon: Briefcase,
    name: "Business",
    category: "business",
    description: "Flexible, remote-friendly coaching for people who train around a demanding work life, wherever they are.",
  },
  {
    icon: Trophy,
    name: "Athlete",
    category: "athlete",
    description: "Performance testing and periodized programming for clients training toward a specific competitive or performance goal.",
  },
];

const QUOTE_IMAGE = {
  src: "https://images.pexels.com/photos/2827392/pexels-photo-2827392.jpeg?auto=compress&cs=tinysrgb&w=1200",
  alt: "A runner sprinting outdoors on an open sandy track.",
};

const GALLERY = [
  {
    src: "https://images.pexels.com/photos/2261477/pexels-photo-2261477.jpeg?auto=compress&cs=tinysrgb&w=1200",
    alt: "A lifter performing a barbell deadlift on a gym platform.",
  },
  {
    src: "https://images.pexels.com/photos/4761792/pexels-photo-4761792.jpeg?auto=compress&cs=tinysrgb&w=1200",
    alt: "Close-up of a boxer's wrapped hands resting in boxing gloves.",
  },
  {
    src: "https://images.pexels.com/photos/1552242/pexels-photo-1552242.jpeg?auto=compress&cs=tinysrgb&w=1200",
    alt: "Two people doing battle-rope conditioning work in a gym.",
  },
  {
    src: "https://images.pexels.com/photos/4056723/pexels-photo-4056723.jpeg?auto=compress&cs=tinysrgb&w=1200",
    alt: "Two people stretching through a floor mobility sequence.",
  },
  {
    src: "https://images.pexels.com/photos/39219684/pexels-photo-39219684.jpeg?auto=compress&cs=tinysrgb&w=1200",
    alt: "A trainer coaches a client through a high-intensity battle rope exercise in a gym.",
  },
  {
    src: "https://images.pexels.com/photos/36115189/pexels-photo-36115189.jpeg?auto=compress&cs=tinysrgb&w=1200",
    alt: "Portioned meal-prep trays with pasta, vegetables, and lean protein.",
  },
  {
    src: "https://images.pexels.com/photos/33846716/pexels-photo-33846716.jpeg?auto=compress&cs=tinysrgb&w=1200",
    alt: "A personal trainer spotting and guiding a client through a dumbbell exercise.",
  },
  {
    src: "https://images.pexels.com/photos/18060078/pexels-photo-18060078.jpeg?auto=compress&cs=tinysrgb&w=1200",
    alt: "A person lifting dumbbells during a strength-training session in a gym.",
  },
];

async function fetchCoachName(): Promise<string> {
  try {
    const row = await database()("users").select("name").where({ role: "coach" }).first();
    return (row?.name as string | undefined) || "Your Coach";
  } catch {
    return "Your Coach";
  }
}

async function fetchTierPricing(): Promise<Record<TierCategory, TierPricing>> {
  const pricing: Record<TierCategory, TierPricing> = { elite: null, business: null, athlete: null };
  try {
    const rows = await database()("packages")
      .where({ is_active: true })
      .whereIn("category", ["elite", "business", "athlete"])
      .select("category", "price", "billing_interval");
    for (const row of rows) {
      const category = row.category as TierCategory;
      if (!pricing[category]) {
        pricing[category] = { price: Number(row.price), billingInterval: String(row.billing_interval) };
      }
    }
  } catch {
    // Marketing page should never fail to render because pricing couldn't load —
    // tiers fall back to "Contact for pricing" below.
  }
  return pricing;
}

export default async function Home() {
  const session = await readSession();
  if (session) redirect(session.role === "coach" ? "/coach" : "/client");

  const [coachName, tierPricing] = await Promise.all([fetchCoachName(), fetchTierPricing()]);

  return (
    <main className="lp">
      <LandingNavbar />

      <section className="lp-hero">
        <div className="lp-hero-media">
          <img
            src="/brand/hero.jpg"
            alt="A determined athlete training in the gym."
            className="lp-hero-img"
          />
          <div className="lp-hero-overlay" aria-hidden="true" />
        </div>
        <div className="lp-hero-copy">
          <span className="lp-eyebrow">
            <Sparkles size={14} /> Online coaching, built around you
          </span>
          <h1>
            Build strength.
            <br />
            Keep life in balance.
          </h1>
          <p>
            Custom diet and workout plans, real personal training, and a coach who&rsquo;s actually paying attention —
            all in one place, all on your phone.
          </p>
          <div className="lp-hero-actions">
            <Link href="/login" className="lp-cta">
              Book a Consultation
              <span className="lp-cta-arrow">
                <ArrowUpRight size={16} />
              </span>
            </Link>
            <a href="#how-it-works" className="lp-ghost-link">
              See how it works
            </a>
          </div>
        </div>
      </section>

      <div className="lp-trust-strip">
        {TRUST_POINTS.map((point) => (
          <div key={point.label} className="lp-trust-item">
            <point.icon size={16} />
            <span>{point.label}</span>
          </div>
        ))}
      </div>

      <section id="services" className="lp-section lp-services">
        <div className="lp-section-head">
          <span className="lp-eyebrow">What we offer</span>
          <h2>Four services. One coach who knows your plan.</h2>
        </div>
        <div className="lp-services-grid">
          {SERVICES.map((service, index) => (
            <article key={service.title} className="lp-service-card">
              <div className="lp-service-media">
                <img src={service.image.src} alt={service.image.alt} loading="lazy" />
                <div className="lp-service-overlay" aria-hidden="true" />
              </div>
              <div className="lp-service-body">
                <span className="lp-service-number">{String(index + 1).padStart(2, "0")}</span>
                <service.icon size={18} className="lp-service-icon" />
                <h3>{service.title}</h3>
                <p>{service.description}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section id="how-it-works" className="lp-section lp-how">
        <div className="lp-section-head">
          <span className="lp-eyebrow">How it works</span>
          <h2>From first call to next check-in.</h2>
        </div>
        <div className="lp-steps">
          {STEPS.map((step, index) => (
            <div key={step.title} className="lp-step">
              <span className="lp-step-number">{String(index + 1).padStart(2, "0")}</span>
              <span className="lp-step-icon">
                <step.icon size={18} />
              </span>
              <h3>{step.title}</h3>
              <p>{step.description}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="lp-section lp-why">
        <div className="lp-why-media">
          <img src={WHY_SOFIT_IMAGE.src} alt={WHY_SOFIT_IMAGE.alt} loading="lazy" />
          <div className="lp-why-media-overlay" aria-hidden="true" />
        </div>
        <div className="lp-why-copy">
          <span className="lp-eyebrow">Why SoFit</span>
          <h2>Coaching, not an app that pretends to be one.</h2>
          <div className="lp-why-list">
            {WHY_SOFIT.map((item) => (
              <div key={item.title} className="lp-why-item">
                <span className="lp-why-icon">
                  <item.icon size={18} />
                </span>
                <div>
                  <h3>{item.title}</h3>
                  <p>{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="lp-stats">
        <div className="lp-stats-grid">
          {STATS.map((stat) => (
            <div key={stat.label} className="lp-stat">
              <strong>{stat.value}</strong>
              <span>{stat.label}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="lp-section lp-coach">
        <div className="lp-coach-card">
          <div className="lp-coach-media">
            <img src={COACH_IMAGE.src} alt={COACH_IMAGE.alt} loading="lazy" />
            <div className="lp-coach-media-overlay" aria-hidden="true" />
          </div>
          <div className="lp-coach-copy">
            <span className="lp-eyebrow">Meet your coach</span>
            <h2>{coachName}</h2>
            <p>
              Every plan on SoFit is built and reviewed by one coach — the same person who reads your check-ins and
              answers your messages. No rotating staff, no hand-offs between sessions.
            </p>
            <ul className="lp-coach-points">
              {COACH_POINTS.map((point) => (
                <li key={point}>
                  <CheckCircle2 size={16} /> {point}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section id="tiers" className="lp-section lp-tiers">
        <div className="lp-section-head">
          <span className="lp-eyebrow">Personal Training</span>
          <h2>Three tiers, one standard of coaching.</h2>
        </div>
        <div className="lp-tiers-grid">
          {TIERS.map((tier, index) => {
            const pricing = tierPricing[tier.category];
            return (
              <article key={tier.name} className="lp-tier-card">
                <span className="lp-tier-number">{String(index + 1).padStart(2, "0")}</span>
                <span className="lp-tier-icon">
                  <tier.icon size={20} />
                </span>
                <h3>{tier.name}</h3>
                <p>{tier.description}</p>
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
                  Join Now <ArrowUpRight size={14} />
                </Link>
              </article>
            );
          })}
        </div>
      </section>

      <section className="lp-quote">
        <div className="lp-quote-media">
          <img src={QUOTE_IMAGE.src} alt={QUOTE_IMAGE.alt} loading="lazy" />
          <div className="lp-quote-media-overlay" aria-hidden="true" />
        </div>
        <div className="lp-quote-content">
          <Quote size={30} className="lp-quote-mark" aria-hidden="true" />
          <blockquote>Consistency gets easier when every next step feels clear.</blockquote>
          <span className="lp-quote-attribution">THE SOFIT METHOD</span>
        </div>
      </section>

      <section id="gallery" className="lp-section lp-gallery">
        <div className="lp-section-head">
          <span className="lp-eyebrow">In the work</span>
          <h2>Training, in frame.</h2>
        </div>
        <div className="lp-gallery-grid">
          {GALLERY.map((photo) => (
            <div key={photo.src} className="lp-gallery-item">
              <img src={photo.src} alt={photo.alt} loading="lazy" />
            </div>
          ))}
        </div>
      </section>

      <section className="lp-closing">
        <img
          src="https://images.pexels.com/photos/6388369/pexels-photo-6388369.jpeg?auto=compress&cs=tinysrgb&w=1200"
          alt="A person pausing to catch their breath after a workout."
          loading="lazy"
          className="lp-closing-img"
        />
        <div className="lp-closing-overlay" aria-hidden="true" />
        <div className="lp-closing-content">
          <h2>Consistency gets easier when every next step is clear.</h2>
          <Link href="/login" className="lp-cta">
            Book a Consultation
            <span className="lp-cta-arrow">
              <ArrowUpRight size={16} />
            </span>
          </Link>
        </div>
      </section>

      <LandingFooter />
    </main>
  );
}
