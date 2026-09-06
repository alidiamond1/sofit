import { ArrowUpRight, Check } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { LandingFooter } from "@/components/landing/landing-footer";
import { LandingNavbar } from "@/components/landing/landing-navbar";
import type { MarketingProgram } from "@/lib/marketing/content";
import styles from "./marketing-pages.module.css";
import sectionStyles from "./marketing-sections.module.css";

export const marketingStyles = { ...styles, ...sectionStyles };

export function MarketingPageShell({ children }: { children: ReactNode }) {
  return (
    <div className={`lp ${styles.site}`}>
      <LandingNavbar />
      <main id="main-content" className={styles.main}>
        {children}
      </main>
      <LandingFooter />
    </div>
  );
}

export function EditorialHero({
  eyebrow,
  title,
  description,
  imageSrc,
  imageAlt,
  imagePosition = "center",
  aside,
  children,
}: {
  eyebrow: string;
  title: ReactNode;
  description: string;
  imageSrc: string;
  imageAlt: string;
  imagePosition?: string;
  aside?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <section className={styles.hero}>
      <div className={styles.heroCopy}>
        <span className={styles.eyebrow}>{eyebrow}</span>
        <h1>{title}</h1>
        <p>{description}</p>
        {children ? <div className={styles.heroActions}>{children}</div> : null}
      </div>
      <div className={styles.heroMedia}>
        <Image
          src={imageSrc}
          alt={imageAlt}
          fill
          priority
          sizes="(max-width: 760px) 100vw, 52vw"
          style={{ objectPosition: imagePosition }}
        />
        <div className={styles.heroShade} aria-hidden="true" />
        {aside ? <div className={styles.heroAside}>{aside}</div> : null}
      </div>
    </section>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  description,
  compact = false,
}: {
  eyebrow: string;
  title: ReactNode;
  description?: string;
  compact?: boolean;
}) {
  return (
    <header className={`${styles.sectionHeading}${compact ? ` ${styles.sectionHeadingCompact}` : ""}`}>
      <span className={styles.eyebrow}>{eyebrow}</span>
      <h2>{title}</h2>
      {description ? <p>{description}</p> : null}
    </header>
  );
}

export function PrimaryLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className={styles.primaryLink}>
      <span>{children}</span>
      <span className={styles.linkArrow} aria-hidden="true">
        <ArrowUpRight size={16} />
      </span>
    </Link>
  );
}

export function TextLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className={styles.textLink}>
      {children}
      <ArrowUpRight size={15} aria-hidden="true" />
    </Link>
  );
}

export function ProgramPanel({
  program,
  price,
}: {
  program: MarketingProgram;
  price?: { amount: string; note?: string } | null;
}) {
  return (
    <article className={styles.programPanel} id={program.slug}>
      <span className={styles.eyebrow}>
        {program.number} — {program.eyebrow}
      </span>
      <div className={styles.programTitleRow}>
        <h3>{program.name}</h3>
        {price ? (
          <div className={styles.programPrice}>
            <strong>{price.amount}</strong>
            {price.note ? <span>{price.note}</span> : null}
          </div>
        ) : null}
      </div>
      <p className={styles.programSummary}>{program.summary}</p>
      <div className={styles.programBody}>
        <p>{program.description}</p>
        <ul>
          {program.outcomes.map((outcome) => (
            <li key={outcome}>
              <Check size={14} aria-hidden="true" />
              {outcome}
            </li>
          ))}
        </ul>
        <div className={styles.bestFor}>
          <span>Best for</span>
          <p>{program.bestFor}</p>
        </div>
        <TextLink href="/contact">Talk to the coach</TextLink>
      </div>
    </article>
  );
}

export function ImageFrame({
  src,
  alt,
  caption,
  position = "center",
}: {
  src: string;
  alt: string;
  caption?: string;
  position?: string;
}) {
  return (
    <figure className={styles.imageFrame}>
      <div className={styles.imageFrameMedia}>
        <Image src={src} alt={alt} fill sizes="(max-width: 760px) 100vw, 50vw" style={{ objectPosition: position }} />
        <div className={styles.imageFrameShade} aria-hidden="true" />
      </div>
      {caption ? <figcaption>{caption}</figcaption> : null}
    </figure>
  );
}

export function ClosingCta({
  eyebrow = "Ready when you are",
  title,
  text,
}: {
  eyebrow?: string;
  title: ReactNode;
  text: string;
}) {
  return (
    <section className={styles.closingCta}>
      <div>
        <span className={styles.eyebrow}>{eyebrow}</span>
        <h2>{title}</h2>
      </div>
      <div className={styles.closingAction}>
        <p>{text}</p>
        <PrimaryLink href="/contact">Start the conversation</PrimaryLink>
      </div>
    </section>
  );
}
