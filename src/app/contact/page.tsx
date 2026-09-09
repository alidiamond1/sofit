import type { Metadata } from "next";
import Image from "next/image";
import { ArrowUpRight, MessageCircle, Video, Globe2 } from "lucide-react";
import { redirect } from "next/navigation";
import { ContactForm } from "@/components/landing/contact-form";
import { MarketingPageShell, marketingStyles as styles } from "@/components/marketing/marketing-page";
import { readSession } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "Contact Coach Ali",
  description: "Talk directly with SoFit about a consultation, fitness goal, meal plan, workout plan, or personal training.",
};

export default async function ContactPage({ searchParams }: { searchParams: Promise<{ subject?: string | string[] }> }) {
  const session = await readSession();
  if (session) redirect(session.role === "coach" ? "/coach" : "/client");
  const { subject } = await searchParams;
  const initialSubject = typeof subject === "string" ? subject.slice(0, 160).replaceAll("-", " ") : "";

  return (
    <MarketingPageShell>
      <section className={styles.contactPage} aria-labelledby="contact-title">
        <header className={styles.contactHeading}>
          <div><span className={styles.eyebrow}>Your next chapter starts here</span><h1 id="contact-title">A conversation.<br /><em>A clearer direction.</em></h1></div>
          <p>A goal, a question, or a fresh start. Tell Coach Ali what is on your mind and find the support that fits your life.</p>
        </header>
        <div className={styles.contactGrid}>
          <aside className={styles.contactAside} aria-label="Other ways to connect">
            <div className={styles.contactCoachPhoto}>
              <Image src="/brand/coach-training-03.jpg" alt="Coach Ali seated in the gym." fill priority sizes="(max-width: 767px) 100vw, 40vw" />
              <div><span>YOUR COACH, ON THE OTHER SIDE</span><h2>Talk to Coach Ali.</h2><p>Personal coaching. Direct conversation.</p></div>
            </div>
            <a className={styles.contactChannel} href="https://wa.me/252610208888" target="_blank" rel="noreferrer"><span><MessageCircle size={22} aria-hidden="true" /></span><div><strong>Start on WhatsApp</strong><small>+252 61 020 8888</small></div><ArrowUpRight size={19} aria-hidden="true" /></a>
            <a className={styles.contactChannel} href="https://www.tiktok.com/@sofit.so" target="_blank" rel="noreferrer"><span><Video size={22} aria-hidden="true" /></span><div><strong>Get to know SoFit</strong><small>Training and coaching at @sofit.so</small></div><ArrowUpRight size={19} aria-hidden="true" /></a>
            <div className={styles.contactOnline}><Globe2 size={19} aria-hidden="true" /><p><strong>Online coaching, wherever you are.</strong><span>No visit needed. Connect with the coach from your own space.</span></p></div>
          </aside>
          <div id="contact-form" className={styles.contactFormPanel}>
            <div className={styles.contactFormHeading}><span className={styles.eyebrow}>Let&apos;s get to know you</span><h2>What would you like to work on?</h2><p>Share a little about your goal and the support you need.</p></div>
            <ContactForm initialSubject={initialSubject} />
          </div>
        </div>
      </section>
      <section className={styles.contactQuestions} aria-labelledby="contact-questions-title">
        <div><span className={styles.eyebrow}>Before you say hello</span><h2 id="contact-questions-title">A little clarity.</h2><p>You do not need to have everything figured out before getting in touch.</p></div>
        <div className={styles.contactAnswers}>
          <details><summary>I am not sure which program I need.</summary><p>Start with your goal and what your week looks like. Coach Ali can help you decide whether a consultation, meal plan, workout plan, or personal training is the right fit.</p></details>
          <details><summary>What should I include in my message?</summary><p>Your main goal, current training experience, and the time you have available are a useful starting point. You can also mention the program or package you are interested in.</p></details>
          <details><summary>Can I get coaching online?</summary><p>Yes. SoFit brings your plans, check-ins, progress, and direct coach messages together online. Ask about the support that matches your routine and equipment.</p></details>
        </div>
      </section>
    </MarketingPageShell>
  );
}
