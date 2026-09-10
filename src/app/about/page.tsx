import type { Metadata } from "next";
import Image from "next/image";
import { ArrowUpRight, ChartNoAxesCombined, HeartHandshake, Target } from "lucide-react";
import { MarketingPageShell, PrimaryLink, SectionHeading, TextLink, marketingStyles as styles } from "@/components/marketing/marketing-page";
import { coachingPrinciples, coachingProcess } from "@/lib/marketing/content";

export const metadata: Metadata = {
  title: "About the SOFIT Team",
  description: "Meet the SOFIT team: Coach Ali Abdullahi, Shabazz Abdulkadir, and Dr. Shafi Abdullahi, Chief Scientific & Medication Safety Advisor.",
};

const principleIcons = [Target, ChartNoAxesCombined, HeartHandshake];

export default function AboutPage() {
  return (
    <MarketingPageShell>
      <section className={styles.aboutHero} aria-labelledby="about-title">
        <div className={styles.aboutHeroTop}><span className={styles.eyebrow}>The people behind your progress</span><span className={styles.aboutEdition}>SOFIT NUTRITION &amp; FITNESS</span></div>
        <div className={styles.aboutHeadline}>
          <h1 id="about-title" className={styles.aboutTitle}>Real coaching.<br /><em>For your real life.</em></h1>
          <div><p>Your goals deserve more than a template. Meet the people behind SOFIT, with expertise in fitness, nutrition, development, capacity building, and pharmaceutical science.</p><TextLink href="#meet-coach">Meet the team</TextLink></div>
        </div>
        <div className={styles.aboutMosaic}>
          <div className={styles.aboutMainPhoto}><Image src="/brand/coach-training-03.jpg" alt="Coach Ali seated in the gym between training sessions." fill priority sizes="(max-width: 767px) 100vw, 62vw" /><span>THE COACH. THE WORK. THE EVERYDAY.</span></div>
          <div className={styles.aboutSidePhoto}><Image src="/brand/coach-training-02.jpg" alt="Coach Ali performing a cable exercise." fill sizes="(max-width: 767px) 50vw, 30vw" /></div>
          <div className={styles.aboutMosaicNote}><span>Personal support.<br />Lasting progress.</span><ArrowUpRight size={32} aria-hidden="true" /><p>Training. Nutrition.<br />Accountability.</p></div>
        </div>
      </section>

      <section id="meet-coach" className={styles.aboutTeam} aria-labelledby="meet-title">
        <header className={styles.teamHeading}>
          <span className={styles.eyebrow}>Meet the team</span>
          <h2 id="meet-title">Experience with purpose.<br /><em>People at the heart.</em></h2>
          <p>Get to know the people, qualifications, and experience behind SOFIT.</p>
        </header>

        <article className={styles.teamProfile} aria-labelledby="ali-name">
          <div className={styles.teamPortrait}>
            <Image src="/brand/coach-ali-abdullahi.jpg" alt="Portrait of Coach Ali Abdullahi, founder of SOFIT Nutrition & Fitness." fill sizes="(max-width: 767px) calc(100vw - 32px), (max-width: 1200px) 38vw, 420px" />
          </div>
          <div className={styles.teamCopy}>
            <span className={styles.eyebrow}>Founder &amp; fitness coach</span>
            <h3 id="ali-name">Coach Ali Abdullahi</h3>
            <p className={styles.teamRole}>SOFIT Nutrition &amp; Fitness</p>
            <dl className={styles.teamCredentials}>
              <div><dt>Coaching experience</dt><dd><strong>6+</strong> years</dd></div>
              <div><dt>Professional certification</dt><dd>ISSA Certified Elite Trainer</dd></div>
            </dl>
            <p>Coach Ali Abdullahi is an ISSA Certified Elite Trainer, fitness and nutrition professional, and the founder of SOFIT Nutrition &amp; Fitness. He brings over six years of coaching experience, with professional qualifications in personal training, corrective exercise, strength and conditioning, and nutrition coaching.</p>
            <p>His work focuses on body transformation, fat loss, strength development, and healthy lifestyle change, helping clients build habits that support sustainable results.</p>
            <PrimaryLink href="/contact?subject=consultation#contact-form">Work with Coach Ali</PrimaryLink>
          </div>
        </article>

        <article className={styles.teamProfile} aria-labelledby="shabazz-name">
          <div className={styles.teamPortrait}>
            <Image src="/brand/shabazz-abdulkadir.jpg" alt="Portrait of Shabazz Abdulkadir, international development and capacity building consultant." fill sizes="(max-width: 767px) calc(100vw - 32px), (max-width: 1200px) 38vw, 420px" />
          </div>
          <div className={styles.teamCopy}>
            <span className={styles.eyebrow}>International consultant</span>
            <h3 id="shabazz-name">Shabazz Abdulkadir</h3>
            <p className={styles.teamRole}>Development &amp; capacity building</p>
            <dl className={styles.teamCredentials}>
              <div><dt>Industry experience</dt><dd><strong>10+</strong> years</dd></div>
              <div><dt>Education</dt><dd>Master’s degree<span>University of Washington</span></dd></div>
            </dl>
            <p>Shabazz Abdulkadir is an international consultant specialising in development and capacity building. She holds a master’s degree from the University of Washington and brings over ten years of experience in the industry.</p>
            <p>Her professional background combines advanced academic training with extensive experience in development and strengthening capacity.</p>
          </div>
        </article>
        <article className={styles.teamProfile} aria-labelledby="shafi-name">
          <div className={styles.teamPortrait}>
            <Image src="/brand/dr-shafi-abdullahi.jpg" alt="Portrait of Dr. Shafi Abdullahi, SOFIT Chief Scientific and Medication Safety Advisor." fill sizes="(max-width: 767px) calc(100vw - 32px), (max-width: 1200px) 38vw, 420px" />
          </div>
          <div className={styles.teamCopy}>
            <span className={styles.eyebrow}>Scientific advisory</span>
            <h3 id="shafi-name">Dr. Shafi Abdullahi</h3>
            <p className={styles.teamRole}>Chief Scientific &amp; Medication Safety Advisor</p>
            <dl className={styles.teamCredentials}>
              <div><dt>Academic qualifications</dt><dd>PharmD · PhD · MBA</dd></div>
              <div><dt>Founder</dt><dd>Drug Eye Africa<span>Medicines regulation &amp; pharmaceutical policy</span></dd></div>
            </dl>
            <p>Dr. Shafi Abdullahi serves as SOFIT’s Chief Scientific &amp; Medication Safety Advisor. He holds a Doctor of Pharmacy (PharmD), a PhD in Pharmacoeconomics, and an MBA in Pharmaceutical Management, bringing a multidisciplinary perspective across pharmaceutical science, health economics, and management.</p>
            <p>He is the founder of Drug Eye Africa, an independent organization that monitors medicines regulation, regulatory decisions, and pharmaceutical policy developments across Africa.</p>
          </div>
        </article>
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
