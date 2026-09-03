"use client";

import { Check, Copy, Mail, Send } from "lucide-react";
import { useTranslations } from "next-intl";
import { useActionState, useState } from "react";
import { createInviteAction } from "@/app/actions/onboarding";

export function InviteForm() {
  const t = useTranslations("Invites");
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
        <div><span className="eyebrow">{t("formStep")}</span><h2>{t("formTitle")}</h2><p>{t("formHint")}</p></div>
      </div>
      <form action={formAction} className="invite-form">
        <label htmlFor="invite-email"><span>{t("clientEmailAddress")}</span><input id="invite-email" name="email" type="email" placeholder="client@email.com" autoComplete="email" required /></label>
        <button className="button primary" disabled={pending}><Send size={15} /> {pending ? t("creatingInvite") : t("createSecureLink")}</button>
      </form>
      {state.error ? <p className="form-error invite-message">{state.error}</p> : null}
      {state.link ? <div className="invite-link"><div><Check size={15} /><span>{state.link}</span></div><button type="button" className="button secondary small" onClick={copyLink}>{copied ? <Check size={14} /> : <Copy size={14} />} {copied ? t("copied") : t("copyLink")}</button></div> : <div className="invite-link muted"><Mail size={15} /><span>{t("linkAppearsHint")}</span></div>}
      <p className="invite-composer-note">{t("formNote")}</p>
    </section>
  );
}

