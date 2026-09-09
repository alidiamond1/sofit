import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowDownRight, ArrowUpRight, Check, ClipboardCheck, Dumbbell, MessageCircle, Play, Utensils } from "lucide-react";
import { MarketingPageShell, PrimaryLink, SectionHeading, TextLink } from "@/components/marketing/marketing-page";
import { coachingProcess, personalTrainingTiers, programs, progressSignals } from "@/lib/marketing/content";
import { readSession } from "@/lib/auth/session";
import styles from "./home.module.css";

export const metadata: Metadata = {
  title: "Online Fitness & Nutrition Coaching",
  description: "Coach-led meal plans, workout programming, consultations, and personal training built around your real routine.",
};

const programIcons = [ClipboardCheck, Utensils, Dumbbell, MessageCircle];
const faqs = [
  { question: "Do I need gym experience before I start?", answer: "No. Your consultation establishes your starting point, available equipment, and confidence level so the plan meets you where you are." },
  { question: "Is SoFit only for weight loss?", answer: "No. SoFit supports fat loss, muscle gain, improved fitness, and performance goals through different combinations of nutrition, programming, and coaching." },
  { question: "Can I train remotely?", answer: "Yes. Meal and workout plans are delivered through your client dashboard, and the Business personal-training tier is designed for flexible or remote coaching." },
  { question: "What happens after the consultation?", answer: "Coach Ali recommends the right path, then your plan is built, assigned, tracked, and adjusted through check-ins and direct feedback." },
];

export default async function Home() {
  const session = await readSession();
  if (session) redirect(session.role === "coach" ? "/coach" : "/client");

  return (
    <MarketingPageShell>
      <section className={styles.hero} aria-labelledby="home-title">
        <div className={styles.heroMedia}>
          <Image src="/brand/coach-training-02.jpg" alt="Coach Ali training with a cable machine in the gym." fill priority sizes="100vw" className={styles.heroImage} />
          <div className={styles.heroWash} aria-hidden="true" />
        </div>
        <div className={styles.heroCopy}>
          <span className={styles.eyebrow}>Bilow safarkaaga jir-dhiseed</span>
          <h1 id="home-title">Your plan.<br />Your pace.<br /><em>Your proof.</em></h1>
          <p>Personal fitness and nutrition coaching from Coach Ali—built around your body, your week, and the result you are ready to work for.</p>
          <div className={styles.heroActions}>
            <PrimaryLink href="/contact">Book a consultation</PrimaryLink>
            <TextLink href="/programs">Explore programs</TextLink>
          </div>
        </div>
        <div className={styles.heroNote}><span>Coach Ali</span><p>Fitness &amp; nutrition coaching</p></div>
        <a className={styles.scrollCue} href="#programs" aria-label="Scroll to explore programs"><span>Discover</span><ArrowDownRight size={18} aria-hidden="true" /></a>
      </section>

      <section className={styles.proofRail} aria-label="SoFit in numbers">
        <div><strong>45K+</strong><span>TikTok community</span></div>
        <div><strong>04</strong><span>Coaching pathways</span></div>
        <div><strong>1:1</strong><span>Coach-led direction</span></div>
        <div><strong>Weekly</strong><span>Progress check-ins</span></div>
      </section>

      <section id="programs" className={styles.programsSection}>
        <div className={styles.sectionTopline}>
          <SectionHeading eyebrow="Choose your path" title={<>Four ways to make the next step <em>clear.</em></>} description="Start with the support you need now. Every path can grow with you as your goals, routine, and level change." />
          <TextLink href="/programs">View every program</TextLink>
        </div>
        <div className={styles.programGrid}>
          {programs.map((program, index) => {
            const Icon = programIcons[index];
            return (
              <Link href={`/programs#${program.slug}`} key={program.slug} className={`${styles.programCard} ${styles[`programCard${index + 1}`]}`}>
                <Image src={program.imageSrc} alt={program.imageAlt} fill sizes="(max-width: 767px) 100vw, (max-width: 1151px) 50vw, 60vw" className={styles.programCardImage} />
                <div className={styles.programShade} aria-hidden="true" />
                <div className={styles.programCardTop}><span>{program.number}</span><Icon size={19} aria-hidden="true" /></div>
                <div className={styles.programCardBody}><p>{program.eyebrow}</p><h3>{program.name}</h3><span>{program.summary}</span></div>
                <ArrowUpRight className={styles.cardArrow} size={20} aria-hidden="true" />
              </Link>
            );
          })}
        </div>
      </section>

      <section className={styles.trainingSection} aria-labelledby="training-title">
        <div className={styles.trainingHeader}>
          <div><span className={styles.eyebrow}>Built for your starting point</span><h2 id="training-title">Stronger looks different<br />on <em>everyone.</em></h2></div>
          <p>Your first session or your next personal best. Coaching for men and women, with a plan shaped around your experience, schedule, and goals.</p>
        </div>
        <div className={styles.trainingPhoto}>
          <Image src="/brand/fitness/training.png" alt="A man and woman performing dumbbell exercises side by side in a bright gym." fill sizes="(max-width: 1440px) 100vw, 1408px" />
          <span>YOUR START. YOUR STRENGTH.</span>
        </div>
        <div className={styles.trainingGoals}>
          <article><span>01 / BUILD CONFIDENCE</span><h3>Start with the basics.</h3><p>Learn the movements, find your rhythm, and build a routine you can return to.</p></article>
          <article><span>02 / BUILD STRENGTH</span><h3>Give every rep a purpose.</h3><p>Follow structured sessions with clear sets, reps, and a progression that fits your level.</p></article>
          <article><span>03 / STAY CONSISTENT</span><h3>Make room for real life.</h3><p>Keep training connected to your nutrition, recovery, and weekly coach feedback.</p></article>
        </div>
        <TextLink href="/contact?subject=consultation">Find your starting point</TextLink>
      </section>

      <section className={styles.methodSection}>
        <div className={styles.methodIntro}>
          <SectionHeading eyebrow="The SoFit method" title={<>Structure that stays <em>human.</em></>} description="No generic PDF and goodbye. The plan begins with context and keeps changing with the evidence you create." compact />
          <TextLink href="/about">Why Coach Ali coaches this way</TextLink>
        </div>
        <ol className={styles.methodSteps}>
          {coachingProcess.map((step) => <li key={step.number}><span>{step.number}</span><div><h3>{step.title}</h3><p>{step.text}</p></div></li>)}
        </ol>
      </section>

      <section className={styles.coachSection}>
        <div className={styles.coachCollage}>
          <div className={styles.coachMainImage}><Image src="/brand/coach-training-03.jpg" alt="Coach Ali seated in the gym before training." fill sizes="(max-width: 760px) 100vw, 55vw" /></div>
          <div className={styles.coachInsetImage}><Image src="/brand/coach-training-02.jpg" alt="Coach Ali demonstrating focused strength work." fill sizes="(max-width: 760px) 45vw, 22vw" /></div>
          <span className={styles.coachStamp}>SO / FIT</span>
        </div>
        <div className={styles.coachCopy}>
          <span className={styles.eyebrow}>Meet your coach</span>
          <h2>One coach. The full picture.</h2>
          <p>Coach Ali brings training, nutrition, planning, and accountability into one conversation. The same coach who understands the goal builds the plan, reads the check-in, and guides the next adjustment.</p>
          <ul>
            <li><Check size={16} aria-hidden="true" /> Plans built around your actual week</li>
            <li><Check size={16} aria-hidden="true" /> Direct progress review and feedback</li>
            <li><Check size={16} aria-hidden="true" /> One connected view of training and nutrition</li>
          </ul>
          <div className={styles.coachLinks}>
            <PrimaryLink href="/about">Meet Coach Ali</PrimaryLink>
            <a href="https://www.tiktok.com/@sofit.so" target="_blank" rel="noreferrer" className={styles.socialLink}>Follow @sofit.so <ArrowUpRight size={15} aria-hidden="true" /></a>
          </div>
        </div>
      </section>

      <section className={styles.platformSection}>
        <div className={styles.platformCopy}>
          <SectionHeading eyebrow="Coaching in your pocket" title={<>Your day, without the <em>guesswork.</em></>} description="Plans, sessions, check-ins, progress, and coach messages live together—so the next action is always easy to find." compact />
          <div className={styles.platformSignals}>
            {progressSignals.slice(0, 3).map((signal) => <div key={signal.label}><span>{signal.label}</span><p>{signal.title}</p></div>)}
          </div>
        </div>
        <div className={styles.phoneStage} aria-label="Example SoFit client dashboard">
          <div className={styles.phoneGlow} aria-hidden="true" />
          <div className={styles.phone}>
            <div className={styles.phoneBar}><span>9:41</span><span>SOFIT</span></div>
            <div className={styles.phoneGreeting}><span>Good morning</span><strong>Today is a training day.</strong></div>
            <div className={styles.todayCard}><span>LOWER BODY · 42 MIN</span><h3>Strength 03</h3><div><span>5 exercises</span><button type="button" aria-label="Preview workout"><Play size={14} fill="currentColor" /></button></div></div>
            <div className={styles.phoneGrid}><div><span>Nutrition</span><strong>82%</strong><small>On target</small></div><div><span>Check-in</span><strong>Fri</strong><small>2 days</small></div></div>
            <div className={styles.messageCard}><span>Coach Ali</span><p>Good work this week. I have adjusted the next session.</p></div>
          </div>
        </div>
      </section>

      <section className={styles.nutritionSection} aria-labelledby="nutrition-title">
        <div className={styles.nutritionPhoto}><Image src="/brand/fitness/nutrition.png" alt="Fresh vegetables, grilled chicken, and rice in a balanced meal." fill sizes="(max-width: 767px) 100vw, 50vw" /></div>
        <div className={styles.nutritionCopy}>
          <span className={styles.eyebrow}>Fuel the work</span>
          <h2 id="nutrition-title">Train with purpose.<br /><em>Eat with confidence.</em></h2>
          <p>Good nutrition should fit your kitchen and your calendar. Build a repeatable routine with meals you enjoy, practical swaps, and targets that support your training.</p>
          <ul><li><Check size={18} aria-hidden="true" /> Personal calorie and macro targets</li><li><Check size={18} aria-hidden="true" /> Meal options built around your preferences</li><li><Check size={18} aria-hidden="true" /> Adjustments guided by your weekly check-ins</li></ul>
          <PrimaryLink href="/programs#diet-plan">Explore nutrition coaching</PrimaryLink>
        </div>
      </section>

      <section className={styles.tierSection}>
        <SectionHeading eyebrow="Personal training" title={<>Support shaped around the way you <em>perform.</em></>} description="Three service styles for three different kinds of pressure—calendar, location, or performance." />
        <div className={styles.tierGrid}>
          {personalTrainingTiers.map((tier, index) => <article key={tier.name} className={index === 1 ? styles.featuredTier : undefined}><div><span>0{index + 1}</span><small>{tier.marker}</small></div><h3>{tier.name}</h3><p>{tier.description}</p><TextLink href="/programs#personal-training">See the fit</TextLink></article>)}
        </div>
      </section>

      <section className={styles.faqSection}>
        <div><SectionHeading eyebrow="Before you start" title={<>Straight answers. No pressure.</>} description="A good coaching relationship starts with clarity before commitment." compact /><TextLink href="/contact">Ask a different question</TextLink></div>
        <div className={styles.faqList}>
          {faqs.map((item, index) => <details key={item.question} open={index === 0}><summary><span>{String(index + 1).padStart(2, "0")}</span>{item.question}</summary><p>{item.answer}</p></details>)}
        </div>
      </section>

      <section className={styles.closingSection}>
        <Image src="/brand/training-detail.png" alt="Athlete securing lifting straps around a barbell before training." fill sizes="100vw" />
        <div className={styles.closingShade} aria-hidden="true" />
        <div className={styles.closingCopy}>
          <span className={styles.eyebrow}>Your first rep is a conversation</span>
          <h2>Ready to make the next step obvious?</h2>
          <p>Tell Coach Ali what you want to change. You will leave with a clearer direction.</p>
          <div><PrimaryLink href="/contact">Book a consultation</PrimaryLink><a href="https://wa.me/252610208888" target="_blank" rel="noreferrer" className={styles.whatsappLink}>WhatsApp SoFit <ArrowUpRight size={15} aria-hidden="true" /></a></div>
        </div>
      </section>
    </MarketingPageShell>
  );
}
