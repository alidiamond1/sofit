"use client";

import { Check, Copy, Mail, Send } from "lucide-react";
import { useActionState, useState } from "react";
import { createInviteAction } from "@/app/actions/onboarding";

export function InviteForm() {
  const [state, formAction, pending] = useActionState(createInviteAction, {});
  const [copied, setCopied] = useState(false);
  async function copyLink() {
    if (!state.link) return;
    await navigator.clipboard.writeText(state.link);
    setCopied(true);
  }
  return (
    <section className="card invite-composer">
      <div className="invite-composer-heading">
        <span className="invite-composer-icon"><Mail size={19} /></span>
        <div><span className="eyebrow">Step 1</span><h2>Create a private invitation</h2><p>Enter the exact email the client will use for their SoFit account.</p></div>
      </div>
      <form action={formAction} className="invite-form">
        <label htmlFor="invite-email"><span>Client email address</span><input id="invite-email" name="email" type="email" placeholder="client@email.com" autoComplete="email" required /></label>
        <button className="button primary" disabled={pending}><Send size={15} /> {pending ? "Creating invite..." : "Create secure link"}</button>
      </form>
      {state.error ? <p className="form-error invite-message">{state.error}</p> : null}
      {state.link ? <div className="invite-link"><div><Check size={15} /><span>{state.link}</span></div><button type="button" className="button secondary small" onClick={copyLink}>{copied ? <Check size={14} /> : <Copy size={14} />} {copied ? "Copied" : "Copy link"}</button></div> : <div className="invite-link muted"><Mail size={15} /><span>The secure link will appear here after you create the invitation.</span></div>}
      <p className="invite-composer-note">Only the invited email can complete signup. Portal access remains locked until you approve the application.</p>
    </section>
  );
}

