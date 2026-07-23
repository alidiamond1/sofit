"use client";

import { ArrowRight, LockKeyhole, ShieldCheck } from "lucide-react";
import Image from "next/image";
import { useActionState } from "react";
import { createInvitedAccountAction } from "@/app/actions/onboarding";
import logo from "@/assets/png.png";

export function AccountForm({ token, email, name }: { token: string; email: string; name: string }) {
  const action = createInvitedAccountAction.bind(null, token);
  const [state, formAction, pending] = useActionState(action, {});
  return (
    <main className="onboarding-page account-stage">
      <header className="onboarding-top"><Image src={logo} alt="SoFit" priority /><span>Account setup</span></header>
      <section className="account-card">
        <span className="account-icon"><LockKeyhole size={22} /></span>
        <span className="eyebrow">Intake complete</span><h1>Create your SoFit account</h1>
        <p>Thanks, {name}. Create a password for <strong>{email}</strong>. Your account will remain private and pending until the coach reviews your application.</p>
        <form action={formAction} className="login-form">
          <label><span>Email</span><input value={email} readOnly /></label>
          <label><span>Password</span><input name="password" type="password" minLength={8} autoComplete="new-password" required /></label>
          <label><span>Confirm password</span><input name="confirm_password" type="password" minLength={8} autoComplete="new-password" required /></label>
          {state.error ? <p className="form-error">{state.error}</p> : null}
          <button className="button primary login-submit" disabled={pending}>{pending ? "Creating account?" : "Create account"} <ArrowRight size={16} /></button>
        </form>
        <p className="onboarding-privacy"><ShieldCheck size={15} /> Signup is available only through this private invite.</p>
      </section>
    </main>
  );
}

