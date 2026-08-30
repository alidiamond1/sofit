"use client";

import { ArrowUpRight, Menu, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import logo from "@/assets/sofit-logo.png";

const NAV_LINKS = [
  { href: "#services", label: "Coaching" },
  { href: "#services", label: "Diet Coach" },
  { href: "#contact", label: "Contact" },
];

export function LandingNavbar() {
  const [open, setOpen] = useState(false);

  function close() {
    setOpen(false);
  }

  return (
    <header className="lp-nav">
      <div className="lp-nav-inner">
        <Link href="/" className="lp-nav-brand" aria-label="SoFit home" onClick={close}>
          <Image src={logo} alt="SoFit" priority />
        </Link>

        <nav className={`lp-nav-links${open ? " is-open" : ""}`} aria-label="Primary">
          {NAV_LINKS.map((link) => (
            <a key={link.label} href={link.href} onClick={close}>
              {link.label}
            </a>
          ))}
          <div className="lp-nav-actions">
            <Link href="/login" className="lp-nav-login" onClick={close}>
              Log in
            </Link>
            <Link href="/login" className="lp-nav-cta" onClick={close}>
              Book a Consultation
              <span className="lp-nav-cta-arrow">
                <ArrowUpRight size={15} />
              </span>
            </Link>
          </div>
        </nav>

        <button
          type="button"
          className="lp-nav-toggle"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          onClick={() => setOpen((value) => !value)}
        >
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>
    </header>
  );
}
