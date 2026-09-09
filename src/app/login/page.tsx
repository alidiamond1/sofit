import { ArrowLeft, ArrowUpRight, Check } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/auth/login-form";
import { MarketingThemeToggle } from "@/components/marketing/site-navbar";
import { readSession } from "@/lib/auth/session";
import logo from "@/assets/sofit-logo.png";
import styles from "./login.module.css";

export default async function LoginPage() {
  const session = await readSession();
  if (session) redirect(session.role === "coach" ? "/coach" : "/client");

  return (
    <main className={`lp ${styles.page}`}>
      <header className={styles.header}>
        <Link href="/" className={styles.brand} aria-label="SoFit home"><Image src={logo} alt="SoFit" priority /></Link>
        <div className={styles.headerActions}><Link href="/" className={styles.backLink} aria-label="Back to website"><ArrowLeft size={16} aria-hidden="true" /><span>Back to website</span></Link><MarketingThemeToggle /></div>
      </header>
      <div className={styles.layout}>
        <section className={styles.visual} aria-labelledby="login-story-title">
          <Image src="/brand/fitness/login-male-training.png" alt="A man performing a battle-rope workout in a gym." fill priority sizes="(max-width: 899px) 100vw, 55vw" className={styles.visualImage} />
          <div className={styles.visualShade} aria-hidden="true" />
          <span className={styles.photoLabel}>SHOW UP FOR YOURSELF.</span>
          <div className={styles.visualCopy}><span>ONE PLAN. EVERYDAY PROGRESS.</span><h2 id="login-story-title">Your next chapter<br />starts with <em>you.</em></h2><p>Training, nutrition, and a coach in your corner.<br />Keep building on the work you have started.</p><div className={styles.visualPoints}><span><Check size={16} aria-hidden="true" /> Your plan</span><span><Check size={16} aria-hidden="true" /> Your progress</span><span><Check size={16} aria-hidden="true" /> Your coach</span></div></div>
          <div className={styles.visualMark} aria-hidden="true"><ArrowUpRight size={42} /></div>
        </section>
        <section className={styles.panel} aria-label="Sign in to SoFit">
          <LoginForm />
          <div className={styles.help}><span>New to SoFit?</span><Link href="/contact?subject=consultation#contact-form">Meet your coach <ArrowUpRight size={15} aria-hidden="true" /></Link></div>
          <footer className={styles.footer}><span>&copy; {new Date().getFullYear()} SoFit Coaching</span><Link href="/contact">Need help signing in?</Link></footer>
        </section>
      </div>
    </main>
  );
}
