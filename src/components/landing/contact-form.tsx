"use client";

import { ArrowUpRight } from "lucide-react";
import { useActionState } from "react";
import { submitContactAction, type ContactActionState } from "@/app/actions/contact";
import styles from "@/components/marketing/marketing-pages.module.css";

const initialState: ContactActionState = {};

export function ContactForm({ initialSubject = "" }: { initialSubject?: string }) {
  const [state, formAction, pending] = useActionState(submitContactAction, initialState);

  return (
    <form action={formAction} className={styles.contactForm} aria-label="Message Coach Ali" aria-busy={pending}>
      <p className={styles.contactRequired}>All fields are required unless marked optional.</p>
      <fieldset disabled={pending}>
      <div className="lp-contact-form-row">
        <label>
          <span>First name</span>
          <input name="first_name" autoComplete="given-name" placeholder="First name" required maxLength={80} />
        </label>
        <label>
          <span>Last name</span>
          <input name="last_name" autoComplete="family-name" placeholder="Last name" required maxLength={80} />
        </label>
      </div>
      <div className="lp-contact-form-row">
        <label>
          <span>Email</span>
          <input name="email" type="email" autoComplete="email" placeholder="you@example.com" required maxLength={190} />
        </label>
        <label>
          <span>Phone (optional)</span>
          <input name="phone" type="tel" autoComplete="tel" placeholder="Include your country code" maxLength={40} />
        </label>
      </div>
      <label>
        <span>Interested in (optional)</span>
        <input name="subject" list="contact-interests" placeholder="Choose a program or write your own" maxLength={160} defaultValue={initialSubject} />
        <datalist id="contact-interests"><option value="Consultation" /><option value="Meal plan" /><option value="Workout plan" /><option value="Personal training" /><option value="Packages" /></datalist>
      </label>
      <label>
        <span>Message</span>
        <textarea name="message" placeholder="Tell us about your goal, your routine, and how we can help..." rows={5} required minLength={10} maxLength={2000} aria-describedby="contact-message-hint" />
        <small id="contact-message-hint">A few sentences is a good start. 10–2,000 characters.</small>
      </label>
      </fieldset>
      {state.error ? <p className={styles.contactError} role="alert">{state.error}</p> : null}
      {state.success ? <p className={styles.contactSuccess} role="status">{state.success}</p> : null}
      <button type="submit" className={styles.contactSubmit} disabled={pending}>
        {pending ? "Sending your message..." : "Send message"}
        <ArrowUpRight size={20} aria-hidden="true" />
      </button>
      <p className={styles.contactRequired}>Your message goes directly to the SoFit coach.</p>
    </form>
  );
}
