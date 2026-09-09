"use client";

import { ArrowUpRight, Menu, Moon, Sun, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import logo from "@/assets/sofit-logo.png";
import { marketingNav } from "@/lib/marketing/content";
import styles from "./site-chrome.module.css";

function isActivePath(pathname: string, href: string) {
  return href === "/" ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
}

export function MarketingThemeToggle() {
  const t = useTranslations("Topbar");
  function toggleTheme() {
    const theme = document.documentElement.dataset.marketingTheme === "light" ? "dark" : "light";
    document.documentElement.dataset.marketingTheme = theme;
    document.cookie = `sofit-marketing-theme=${theme}; Path=/; Max-Age=31536000; SameSite=Lax`;
  }
  return <button type="button" className={styles.themeToggle} onClick={toggleTheme}>
    <Sun size={18} className={styles.lightIcon} aria-hidden="true" />
    <Moon size={18} className={styles.darkIcon} aria-hidden="true" />
    <span className={`${styles.themeLabel} ${styles.lightIcon}`}>{t("switchToLightMode")}</span>
    <span className={`${styles.themeLabel} ${styles.darkIcon}`}>{t("switchToDarkMode")}</span>
  </button>;
}

export function SiteNavbar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  return (
    <>
      <a className={styles.skipLink} href="#main-content">Skip to content</a>
      <header className={styles.header}>
        <div className={styles.inner}>
          <Link href="/" className={styles.brand} aria-label="SoFit home" onClick={() => setOpen(false)}>
            <Image src={logo} alt="SoFit" priority />
          </Link>

          <MarketingThemeToggle />
          <button
            type="button"
            className={styles.menuButton}
            aria-label={open ? "Close navigation" : "Open navigation"}
            aria-expanded={open}
            aria-controls="marketing-navigation"
            onClick={() => setOpen((current) => !current)}
          >
            {open ? <X size={21} /> : <Menu size={21} />}
          </button>

          <nav
            id="marketing-navigation"
            className={`${styles.navigation}${open ? ` ${styles.navigationOpen}` : ""}`}
            aria-label="Primary navigation"
          >
            <div className={styles.navLinks}>
              {marketingNav.map((item) => {
                const active = isActivePath(pathname, item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={active ? styles.activeLink : undefined}
                    aria-current={active ? "page" : undefined}
                    onClick={() => setOpen(false)}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </div>
            <div className={styles.navActions}>
              <Link href="/login" className={styles.loginLink} onClick={() => setOpen(false)}>Client login</Link>
              <Link href="/contact?subject=consultation" className={styles.navCta} onClick={() => setOpen(false)}>
                Start consultation
                <span aria-hidden="true"><ArrowUpRight size={15} /></span>
              </Link>
            </div>
          </nav>
        </div>
      </header>
      {open ? <button className={styles.backdrop} aria-label="Close navigation" onClick={() => setOpen(false)} /> : null}
    </>
  );
}
