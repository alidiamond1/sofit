"use client";

import { ArrowUpRight, Check, CheckCircle2, CreditCard, LockKeyhole, Package, RefreshCw, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { startCheckoutAction, verifyPaymentAction, type PaymentResult } from "@/app/actions/payments";
import { Badge } from "@/components/dashboard/primitives";

export type BillingInvoice = {
  id: number; number: string; name: string; description: string; category: string; interval: string;
  amount: string; currency: string; status: string; due: string; paidAt: string | null;
  accessUntil: string | null; diet: boolean; workout: boolean; packageInvoice: boolean;
};

export function ClientPaymentsWorkspace({ invoices, currentId, unlocked, configured, active, returnedOrder }: {
  invoices: BillingInvoice[]; currentId: number | null; unlocked: boolean; configured: boolean; active: boolean;
  returnedOrder: { invoiceId: number; orderId: string } | null;
}) {
  const t = useTranslations("Billing");
  const locale = useLocale();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<PaymentResult>({});
  const [openingCheckout, setOpeningCheckout] = useState(false);
  const checkedOrder = useRef<string | null>(null);
  const current = invoices.find((invoice) => invoice.id === currentId);
  const history = invoices.filter((invoice) => invoice.id !== currentId);
  const money = (invoice: BillingInvoice) => new Intl.NumberFormat(locale, { style: "currency", currency: invoice.currency }).format(Number(invoice.amount));
  const date = (value: string) => new Date(value).toLocaleDateString(locale, { year: "numeric", month: "short", day: "numeric", timeZone: "UTC" });

  const returnId = returnedOrder?.orderId;
  const returnInvoiceId = returnedOrder?.invoiceId;
  useEffect(() => {
    if (!returnId || !returnInvoiceId || checkedOrder.current === returnId) return;
    checkedOrder.current = returnId;
    startTransition(async () => {
      const response = await verifyPaymentAction(returnInvoiceId, returnId);
      setResult(response);
      router.replace("/client/payments", { scroll: false });
      router.refresh();
    });
  }, [returnId, returnInvoiceId, router]);

  function checkPayment(id: number) {
    startTransition(async () => {
      setResult(await verifyPaymentAction(id));
      router.refresh();
    });
  }
  function pay() {
    if (!current) return;
    setOpeningCheckout(true);
    setResult({});
    startTransition(async () => {
      try {
        const response = await startCheckoutAction(current.id);
        if (response.url) window.location.assign(response.url);
        else { setResult(response); if (response.paid) router.refresh(); }
      } catch {
        setResult({ error: t("connectionError") });
      } finally {
        setOpeningCheckout(false);
      }
    });
  }

  return <div className="billing-workspace" aria-busy={pending}>
    <header className="billing-heading"><div><span className="eyebrow">{t("eyebrow")}</span><h1>{t("title")}</h1><p>{t("description")}</p></div><span className="billing-secure"><ShieldCheck size={17} />{t("hostedCheckout")}</span></header>
    {(result.error || result.message) && <p className={`billing-notice ${result.error ? "is-error" : "is-success"}`} role={result.error ? "alert" : "status"}>{result.error || result.message}</p>}
    {!active && <p className="billing-notice" role="status">{t("inactive")}</p>}
    <div className="billing-layout">
      <section className="billing-package" aria-labelledby="billing-package-name">
        <div className="billing-package-top"><span className="billing-icon"><Package size={24} /></span><Badge tone={unlocked ? "success" : "warning"}>{unlocked ? t("active") : current ? t("awaitingPayment") : t("awaitingAssignment")}</Badge></div>
        <span className="eyebrow">{t("yourPackage")}</span>
        <h2 id="billing-package-name">{current?.name || t("noPackage")}</h2>
        <p className="billing-package-description">{current?.description || t("assignmentHint")}</p>
        {current ? <>
          <div className="billing-price"><strong>{money(current)}</strong><span>{t(`interval.${current.interval || "one_time"}`)}</span></div>
          <ul className="billing-includes">
            {current.diet && <li><Check size={17} />{t("diet")}</li>}
            {current.workout && <li><Check size={17} />{t("workout")}</li>}
            <li><Check size={17} />{t("support")}</li>
          </ul>
          <dl className="billing-invoice-details"><div><dt>{t("invoice")}</dt><dd>{current.number}</dd></div><div><dt>{unlocked ? t("accessUntil") : t("due")}</dt><dd>{unlocked ? current.accessUntil ? date(current.accessUntil) : t("noExpiry") : date(current.due)}</dd></div></dl>
          {unlocked ? <Link className="button primary full" href={current.diet ? "/client/diet-plan" : current.workout ? "/client/workout-plan" : "/client/sessions"}>{t("openProgram")}<ArrowUpRight size={18} /></Link> : <>
            {!configured && <p className="billing-notice">{t("setupPending")}</p>}
            <button className="button primary full" disabled={pending || !configured || !active} onClick={pay}><CreditCard size={18} />{openingCheckout ? t("openingCheckout") : pending ? t("checking") : t("pay", { amount: money(current) })}<ArrowUpRight size={18} /></button>
            <button className="text-button billing-check" disabled={pending || !configured} onClick={() => checkPayment(current.id)}><RefreshCw size={14} />{t("checkStatus")}</button>
          </>}
          <p className="billing-footnote"><LockKeyhole size={13} />{t("paymentDetails")}</p>
        </> : <Link className="button secondary" href="/client/profile">{t("completeProfile")}<ArrowUpRight size={16} /></Link>}
      </section>
      <aside className="billing-guide">
        <span className="eyebrow">{t("nextStep")}</span><h2>{unlocked ? t("readyTitle") : t("guideTitle")}</h2>
        <ol><li><span>01</span><div><h3>{t("step1Title")}</h3><p>{t("step1Body")}</p></div></li><li><span>02</span><div><h3>{t("step2Title")}</h3><p>{t("step2Body")}</p></div></li><li><span>03</span><div><h3>{t("step3Title")}</h3><p>{t("step3Body")}</p></div></li></ol>
        <div className="billing-renewal"><ShieldCheck size={22} /><div><strong>{t("renewalTitle")}</strong><p>{t("renewalBody")}</p></div></div>
      </aside>
    </div>
    {history.length > 0 && <section className="billing-history"><header><h2>{t("history")}</h2><span>{t("records", { count: history.length })}</span></header><div className="billing-history-grid">{history.map((invoice) => <article key={invoice.id} className="billing-history-card"><div><span className="billing-icon">{invoice.status === "paid" ? <CheckCircle2 size={20} /> : <CreditCard size={20} />}</span><Badge tone={invoice.status === "paid" ? "success" : "neutral"}>{t(`status.${invoice.status}`)}</Badge></div><h3>{invoice.name}</h3><strong>{money(invoice)}</strong><p>{invoice.number}</p><small>{date(invoice.paidAt || invoice.due)}</small>{invoice.packageInvoice && ["unpaid", "overdue"].includes(invoice.status) && <button className="text-button" disabled={pending || !configured} onClick={() => checkPayment(invoice.id)}>{t("checkStatus")}</button>}</article>)}</div></section>}
  </div>;
}
