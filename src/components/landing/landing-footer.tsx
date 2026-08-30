import Image from "next/image";
import Link from "next/link";
import logo from "@/assets/sofit-logo.png";

// Placeholder contact address — replace with the coach's real inbox before launch.
export const COACH_CONTACT_EMAIL = "hello@sofit.example";

export function LandingFooter() {
  return (
    <footer className="lp-footer">
      <div className="lp-footer-inner">
        <div className="lp-footer-brand">
          <Image src={logo} alt="SoFit" />
          <p>Build strength. Keep life in balance.</p>
        </div>
        <div className="lp-footer-links">
          <Link href="/login">Log in</Link>
          <Link href="/contact">Contact</Link>
          <a href={`mailto:${COACH_CONTACT_EMAIL}`}>{COACH_CONTACT_EMAIL}</a>
        </div>
      </div>
      <p className="lp-footer-copyright">© 2026 SoFit. All rights reserved.</p>
    </footer>
  );
}
