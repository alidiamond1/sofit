"use client";

import { Send } from "lucide-react";
import { useActionState } from "react";
import { submitContactAction, type ContactActionState } from "@/app/actions/contact";

const initialState: ContactActionState = {};

export function ContactForm() {
  const [state, formAction, pending] = useActionState(submitContactAction, initialState);

  return (
    <form action={formAction} className="lp-contact-form">
      <div className="lp-contact-form-row">
        <label>
          <span>First name</span>
          <input name="first_name" placeholder="Enter your first name" required maxLength={80} />
        </label>
        <label>
          <span>Last name</span>
          <input name="last_name" placeholder="Enter your last name" required maxLength={80} />
        </label>
      </div>
      <div className="lp-contact-form-row">
        <label>
          <span>Email</span>
          <input name="email" type="email" placeholder="Enter your email" required maxLength={190} />
        </label>
        <label>
          <span>Phone (optional)</span>
          <input name="phone" type="tel" placeholder="Enter your phone number" maxLength={40} />
        </label>
      </div>
      <label>
        <span>Subject (optional)</span>
        <input name="subject" placeholder="What's this about?" maxLength={160} />
      </label>
      <label>
        <span>Message</span>
        <textarea name="message" placeholder="Enter your message" rows={5} required maxLength={2000} />
      </label>
      {state.error ? <p className="lp-contact-form-message is-error">{state.error}</p> : null}
      {state.success ? <p className="lp-contact-form-message is-success">{state.success}</p> : null}
      <button type="submit" className="lp-cta" disabled={pending}>
        {pending ? "Sending..." : "Send Your Message"}
        <span className="lp-cta-arrow">
          <Send size={15} />
        </span>
      </button>
    </form>
  );
}
