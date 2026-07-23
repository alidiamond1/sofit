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
    <section className="card invite-hero">
      <div><span className="badge success">Invite only</span><h2>Send a private intake link</h2><p>Only this email and single-use link can access the form and account setup.</p></div>
      <form action={formAction} className="invite-form"><label className="sr-only" htmlFor="invite-email">Client email</label><input id="invite-email" name="email" type="email" placeholder="client@email.com" required /><button className="button primary" disabled={pending}><Send size={15} /> {pending ? "Creating?" : "Create invite"}</button></form>
      {state.error ? <p className="form-error invite-message">{state.error}</p> : null}
      {state.link ? <div className="invite-link"><span>{state.link}</span><button type="button" className="button secondary small" onClick={copyLink}>{copied ? <Check size={14} /> : <Copy size={14} />} {copied ? "Copied" : "Copy link"}</button></div> : <div className="invite-link muted"><Mail size={15} /><span>A secure link will appear here. Send it to the invited client yourself.</span></div>}
    </section>
  );
}

