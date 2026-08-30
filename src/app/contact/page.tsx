import { ArrowUpRight, Clock3, Mail, MessageCircle, Sparkles } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ContactForm } from "@/components/landing/contact-form";
import { COACH_CONTACT_EMAIL, LandingFooter } from "@/components/landing/landing-footer";
import { LandingNavbar } from "@/components/landing/landing-navbar";
import { readSession } from "@/lib/auth/session";

export default async function ContactPage() {
  const session = await readSession();
  if (session) redirect(session.role === "coach" ? "/coach" : "/client");

  return (
    <main className="lp">
      <LandingNavbar />

      <section className="lp-page-hero">
        <span className="lp-eyebrow">
          <Sparkles size={14} /> Contact Us
        </span>
        <h1>Have questions or want to get in touch?</h1>
        <p>
          SoFit is fully online — no gym to visit, no location to find. Reach out directly and the coach replies
          personally, not an automated inbox.
        </p>
      </section>

      <section className="lp-section lp-contact-split">
        <div className="lp-contact-info">
          <span className="lp-eyebrow">Contact Us</span>
          <h2>Get in touch</h2>
          <p>Fill out the form and the coach will get back to you directly — or reach out straight away below.</p>

          <a className="lp-contact-info-row" href={`mailto:${COACH_CONTACT_EMAIL}`}>
            <span className="lp-contact-icon">
              <Mail size={18} />
            </span>
            <div>
              <strong>Email us at</strong>
              <span>{COACH_CONTACT_EMAIL}</span>
            </div>
          </a>
          <div className="lp-contact-info-row lp-contact-info-row-pending">
            <span className="lp-contact-icon">
              <MessageCircle size={18} />
            </span>
            <div>
              <strong>WhatsApp</strong>
              <span>Coming soon</span>
            </div>
          </div>
          <div className="lp-contact-info-row lp-contact-info-row-static">
            <span className="lp-contact-icon">
              <Clock3 size={18} />
            </span>
            <div>
              <strong>How we reply</strong>
              <span>A real person, no auto-responses.</span>
            </div>
          </div>
        </div>

        <div className="lp-contact-form-panel">
          <ContactForm />
        </div>
      </section>

      <section className="lp-contact-cta">
        <h2>Prefer to talk first?</h2>
        <p>Book a free consultation and skip the form entirely.</p>
        <Link href="/login" className="lp-cta">
          Book a Consultation
          <span className="lp-cta-arrow">
            <ArrowUpRight size={16} />
          </span>
        </Link>
      </section>

      <LandingFooter />
    </main>
  );
}
