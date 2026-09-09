import type { Metadata } from "next";
import Image from "next/image";
import { ArrowUpRight, ChartNoAxesCombined, HeartHandshake, Target } from "lucide-react";
import { MarketingPageShell, PrimaryLink, SectionHeading, TextLink, marketingStyles as styles } from "@/components/marketing/marketing-page";
import { coachingPrinciples, coachingProcess } from "@/lib/marketing/content";

export const metadata: Metadata = {
  title: "About Coach Ali",
  description: "Meet Coach Ali and discover the personal approach to training, nutrition, and consistent progress behind SoFit.",
};

const principleIcons = [Target, ChartNoAxesCombined, HeartHandshake];

export default function AboutPage() {
  return (
    <MarketingPageShell>
      <section className={styles.aboutHero} aria-labelledby="about-title">
        <div className={styles.aboutHeroTop}><span className={styles.eyebrow}>The person behind the plan</span><span className={styles.aboutEdition}>COACH ALI / SOFIT</span></div>
        <div className={styles.aboutHeadline}>
          <h1 id="about-title" className={styles.aboutTitle}>Real coaching.<br /><em>For your real life.</em></h1>
          <div><p>Your goals deserve more than a template. Meet the coach bringing training, nutrition, and personal support into one clear plan.</p><TextLink href="#meet-coach">Get to know Coach Ali</TextLink></div>
        </div>
        <div className={styles.aboutMosaic}>
          <div className={styles.aboutMainPhoto}><Image src="/brand/coach-training-03.jpg" alt="Coach Ali seated in the gym between training sessions." fill priority sizes="(max-width: 767px) 100vw, 62vw" /><span>THE COACH. THE WORK. THE EVERYDAY.</span></div>
          <div className={styles.aboutSidePhoto}><Image src="/brand/coach-training-02.jpg" alt="Coach Ali performing a cable exercise." fill sizes="(max-width: 767px) 50vw, 30vw" /></div>
          <div className={styles.aboutMosaicNote}><span>01 coach.<br />One connected plan.</span><ArrowUpRight size={32} aria-hidden="true" /><p>Training. Nutrition.<br />Accountability.</p></div>
        </div>
      </section>

      <section id="meet-coach" className={styles.aboutStory} aria-labelledby="meet-title">
        <div><span className={styles.eyebrow}>Meet Coach Ali</span><h2 id="meet-title">A person first.<br />A program second.</h2><div className={styles.aboutByline}><span>ALI</span><div><strong>Coach Ali</strong><small>Fitness &amp; nutrition coach</small></div></div></div>
        <div className={styles.aboutStoryCopy}><p>Fitness advice is everywhere. Finding a way to make it work in your own life is the harder part. That is where SoFit begins.</p><p>Coach Ali brings your training, nutrition, and progress into the same conversation. Your schedule, experience, food preferences, and goals shape the plan from the start.</p><p>The relationship continues after the plan is delivered. Check-ins, direct messages, and regular review help turn what you learn each week into a practical next step.</p><PrimaryLink href="/contact?subject=consultation#contact-form">Work with Coach Ali</PrimaryLink></div>
      </section>

      <section className={styles.aboutValues}>
        <SectionHeading eyebrow="What guides the work" title={<>A clear plan. A human approach.</>} description="Three principles behind the way SoFit coaches, reviews progress, and helps you keep going." />
        <div className={styles.aboutValueGrid}>{coachingPrinciples.map((principle, index) => { const Icon = principleIcons[index]; return <article key={principle.number}><div><span className={styles.aboutValueIcon}><Icon size={24} aria-hidden="true" /></span><span>{principle.number}</span></div><h3>{principle.title}</h3><p>{principle.text}</p></article>; })}</div>
      </section>

      <section className={styles.aboutBelief} aria-labelledby="belief-title">
        <div className={styles.aboutBeliefPhoto}><Image src="/brand/coach-training-01.jpg" alt="Coach Ali at a strength training machine in the gym." fill sizes="(max-width: 767px) 100vw, 50vw" /></div>
        <div className={styles.aboutBeliefCopy}><span className={styles.eyebrow}>Progress, with perspective</span><h2 id="belief-title">You do not need<br />a perfect week.<br /><em>You need a way forward.</em></h2><p>Strength, energy, consistency, and confidence all have a place in the picture. Your feedback helps the coach understand what the numbers cannot explain on their own.</p><TextLink href="/results">Explore client transformations</TextLink></div>
      </section>

      <section className={styles.aboutProcess}>
        <div><SectionHeading eyebrow="What working together looks like" title={<>Know your next step.</>} description="A clear rhythm from the first conversation to the next adjustment." compact /><TextLink href="/programs">Find the support that fits</TextLink></div>
        <ol className={styles.aboutTimeline}>{coachingProcess.map((step) => <li key={step.number}><span>{step.number}</span><div><h3>{step.title}</h3><p>{step.text}</p></div></li>)}</ol>
      </section>
    </MarketingPageShell>
  );
}
