"use client";

import { ArrowRight, Eye, EyeOff, ShieldCheck } from "lucide-react";
import { useActionState, useState } from "react";
import { loginAction } from "@/app/actions/auth";
import styles from "@/app/login/login.module.css";

export function LoginForm() {
  const [state, formAction, pending] = useActionState(loginAction, {});
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className={styles.card}>
      <div className={styles.heading}>
        <span className={styles.eyebrow}>YOUR SOFIT SPACE</span>
        <h1>Welcome back.</h1>
        <p>Your plan, your progress, your next step.<br />Sign in to pick up where you left off.</p>
      </div>
      <form action={formAction} className={styles.form} aria-label="Sign in" aria-busy={pending}>
        <label><span>Email address</span><input name="email" type="email" autoComplete="email" placeholder="you@example.com" autoCapitalize="none" spellCheck={false} required disabled={pending} /></label>
        <label><span>Password</span><div className={styles.passwordInput}><input name="password" type={showPassword ? "text" : "password"} autoComplete="current-password" placeholder="Enter your password" minLength={8} required disabled={pending} /><button type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? "Hide password" : "Show password"} aria-pressed={showPassword} disabled={pending}>{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button></div></label>
        {state.error ? <p className={styles.error} role="alert">{state.error}</p> : null}
        <button className={styles.submit} type="submit" disabled={pending}>{pending ? "Signing in..." : "Sign in"} <ArrowRight size={18} aria-hidden="true" /></button>
      </form>
      <p className={styles.security}><ShieldCheck size={16} aria-hidden="true" /> A private space for you and your coach.</p>
    </div>
  );
}
