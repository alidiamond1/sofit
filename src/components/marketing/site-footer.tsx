import { ArrowUpRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import logo from "@/assets/sofit-logo.png";
import { marketingNav } from "@/lib/marketing/content";
import styles from "./site-chrome.module.css";

const WHATSAPP_URL = "https://wa.me/252610208888";
const TIKTOK_URL = "https://www.tiktok.com/@sofit.so";

export function SiteFooter() {
  return (
    <footer className={styles.footer}>
      <div className={styles.footerLead}>
        <div>
          <span className={styles.footerEyebrow}>Fitness &amp; Nutrition company</span>
          <h2>Build a plan that works beyond day one.</h2>
        </div>
        <Link href="/contact?subject=consultation" className={styles.footerCta}>
          Talk to Coach Ali <ArrowUpRight size={17} aria-hidden="true" />
        </Link>
      </div>

      <div className={styles.footerGrid}>
        <div className={styles.footerBrand}>
          <Image src={logo} alt="SoFit" />
          <p>Personal fitness and nutrition coaching with clear plans, direct feedback, and progress you can read.</p>
        </div>
        <nav className={styles.footerNav} aria-label="Footer navigation">
          <span>Explore</span>
          {marketingNav.map((item) => <Link href={item.href} key={item.href}>{item.label}</Link>)}
        </nav>
        <div className={styles.footerNav}>
          <span>Connect</span>
          <a href={WHATSAPP_URL} target="_blank" rel="noreferrer">WhatsApp</a>
          <a href={TIKTOK_URL} target="_blank" rel="noreferrer">TikTok · 45K+ community</a>
          <Link href="/login">Client login</Link>
        </div>
      </div>

      <div className={styles.footerBase}>
        <span>© {new Date().getFullYear()} SoFit</span>
        <span>Coached by a person. Built for real life.</span>
      </div>
    </footer>
  );
}
