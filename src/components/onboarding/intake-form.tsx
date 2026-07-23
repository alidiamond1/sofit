"use client";

import { ArrowLeft, ArrowRight, CheckCircle2, ShieldCheck } from "lucide-react";
import Image from "next/image";
import { useActionState, useEffect, useRef, useState } from "react";
import { submitIntakeAction } from "@/app/actions/onboarding";
import logo from "@/assets/png.png";
import { intakeSections } from "@/lib/onboarding/intake-fields";

export function IntakeForm({ token, email }: { token: string; email: string }) {
  const action = submitIntakeAction.bind(null, token);
  const [state, formAction, pending] = useActionState(action, {});
  const [step, setStep] = useState(0);
  const formRef = useRef<HTMLFormElement>(null);
  const section = intakeSections[step];
  const last = step === intakeSections.length - 1;

  useEffect(() => {
    if (typeof state.missingStep !== "number") return;
    const timeout = window.setTimeout(() => {
      setStep(state.missingStep as number);
      window.requestAnimationFrame(() => {
        const field = formRef.current?.elements.namedItem(state.missingField || "");
        if (field instanceof HTMLElement) field.focus();
      });
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [state.missingField, state.missingStep]);

  function continueToNextStep() {
    const fieldset = formRef.current?.querySelectorAll("fieldset")[step];
    if (!fieldset) return;
    const controls = Array.from(fieldset.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>("input, textarea, select"));
    const invalid = controls.find((control) => !control.checkValidity());
    if (invalid) {
      invalid.reportValidity();
      invalid.focus();
      return;
    }
    setStep((value) => value + 1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <main className="onboarding-page">
      <header className="onboarding-top"><Image src={logo} alt="SoFit" priority /><span>Private client application</span></header>
      <div className="onboarding-progress"><div>{intakeSections.map((item, index) => <span key={item.id} className={index <= step ? "active" : ""} />)}</div><p>Step {step + 1} of {intakeSections.length}</p></div>
      <section className="onboarding-card">
        <div className="onboarding-intro"><span className="eyebrow">Invite verified ? {email}</span><h1>{section.title}</h1><p>{section.subtitle}</p></div>
        <form action={formAction} ref={formRef}>
          {intakeSections.map((item, sectionIndex) => (
            <fieldset key={item.id} className={sectionIndex === step ? "intake-section active" : "intake-section"}>
              <legend className="sr-only">{item.title}</legend>
              {item.fields.map((field) => (
                <label className="intake-field" key={field.name}>
                  <span>{field.label}<b>Required</b></span>
                  {field.type === "textarea" ? <textarea name={field.name} rows={4} required /> : field.type === "choice" ? (
                    <select name={field.name} defaultValue="" required><option value="" disabled>Select an answer</option>{field.options?.map((option) => <option key={option}>{option}</option>)}</select>
                  ) : <input name={field.name} type={field.type === "number" ? "number" : "text"} required />}
                </label>
              ))}
            </fieldset>
          ))}
          {state.error ? <p className="form-error" aria-live="polite">{state.error}</p> : null}
          <div className="onboarding-actions">
            <button className="button secondary" type="button" disabled={step === 0} onClick={() => setStep((value) => value - 1)}><ArrowLeft size={15} /> Back</button>
            {last ? <button className="button primary" type="submit" disabled={pending}>{pending ? "Saving..." : "Complete intake"} <CheckCircle2 size={15} /></button> : <button className="button primary" type="button" onClick={continueToNextStep}>Continue <ArrowRight size={15} /></button>}
          </div>
        </form>
        <p className="onboarding-privacy"><ShieldCheck size={15} /> Your answers are only visible to you and the SoFit coach.</p>
      </section>
    </main>
  );
}

