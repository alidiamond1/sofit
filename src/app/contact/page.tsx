import type { Metadata } from "next";
import { ArrowUpRight, Clock3, MessageCircle, Sparkles, Video } from "lucide-react";
import { redirect } from "next/navigation";
import { ContactForm } from "@/components/landing/contact-form";
import { LandingFooter } from "@/components/landing/landing-footer";
import { LandingNavbar } from "@/components/landing/landing-navbar";
import { readSession } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "Contact Coach Ali",
  description: "Talk directly with SoFit about a consultation, fitness goal, diet plan, workout plan, or personal training.",
};

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

          <a className="lp-contact-info-row" href="https://wa.me/252610208888" target="_blank" rel="noreferrer">
            <span className="lp-contact-icon">
              <MessageCircle size={18} />
            </span>
            <div>
              <strong>WhatsApp SoFit</strong>
              <span>+252 61 020 8888</span>
            </div>
          </a>
          <a className="lp-contact-info-row" href="https://www.tiktok.com/@sofit.so" target="_blank" rel="noreferrer">
            <span className="lp-contact-icon">
              <Video size={18} />
            </span>
            <div>
              <strong>See SoFit on TikTok</strong>
              <span>@sofit.so · 45K+ community</span>
            </div>
          </a>
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
        <a href="https://wa.me/252610208888" target="_blank" rel="noreferrer" className="lp-cta">
          Start on WhatsApp
          <span className="lp-cta-arrow">
            <ArrowUpRight size={16} />
          </span>
        </a>
      </section>

      <LandingFooter />
    </main>
  );
}
