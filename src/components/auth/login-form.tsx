"use client";

import { ArrowRight, Eye, EyeOff, ShieldCheck } from "lucide-react";
import { useActionState, useState } from "react";
import { loginAction } from "@/app/actions/auth";

export function LoginForm() {
  const [state, formAction, pending] = useActionState(loginAction, {});
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="login-card">
      <div className="login-heading">
        <span className="eyebrow">Welcome back</span>
        <h1>Coaching, distilled.</h1>
        <p>Use your email and password. SoFit will open the correct workspace automatically.</p>
      </div>
      <form action={formAction} className="login-form">
        <label><span>Email address</span><input name="email" type="email" autoComplete="email" required /></label>
        <label><span>Password</span><div className="password-input"><input name="password" type={showPassword ? "text" : "password"} autoComplete="current-password" required /><button type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? "Hide password" : "Show password"}>{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button></div></label>
        {state.error ? <p className="form-error" role="alert">{state.error}</p> : null}
        <button className="button primary login-submit" type="submit" disabled={pending}>{pending ? "Signing in?" : "Sign in"} <ArrowRight size={17} /></button>
      </form>
      <p className="login-security"><ShieldCheck size={15} /> Invite-only, encrypted, role-based access.</p>
    </div>
  );
}
