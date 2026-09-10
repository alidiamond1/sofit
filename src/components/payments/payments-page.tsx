import { LockKeyhole, ArrowUpRight, UserRound } from "lucide-react";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { z } from "zod";
import { requireRole } from "@/lib/auth/session";
import { database } from "@/lib/db";
import { todayISO } from "@/lib/schedule";
import { getBilling, snapshotOf } from "@/lib/payments/billing";
import { sifaloConfigured } from "@/lib/payments/sifalo";
import { ClientPaymentsWorkspace, type BillingInvoice } from "./client-payments";

export async function PaymentsPage({ orderId }: { orderId?: string }) {
  const session = await requireRole("client");
  const billing = await getBilling(session.id);
  const rows = await database()("invoices").select("invoices.*", "services.name as service_name")
    .leftJoin("services", "services.id", "invoices.service_id").where("invoices.client_id", billing.client.id).orderBy("invoices.id", "desc");
  const invoices: BillingInvoice[] = rows.map((row) => {
    const snapshot = row.package_snapshot ? snapshotOf(row.package_snapshot) : null;
    return { id: Number(row.id), number: String(row.number), name: snapshot?.name || String(row.service_name || "Coaching"),
      description: snapshot?.description || "", category: snapshot?.category || "", interval: snapshot?.interval || "one_time",
      amount: String(row.amount), currency: String(row.currency || "USD"), status: String(row.status),
      due: todayISO(undefined, new Date(row.due_on)), paidAt: row.paid_at ? new Date(row.paid_at).toISOString() : null,
      accessUntil: row.access_until ? new Date(row.access_until).toISOString() : null,
      diet: Boolean(snapshot?.dietDays.some((day) => day.meals?.length)), workout: Boolean(snapshot?.workoutDays.some((day) => day.exercises?.length)), packageInvoice: Boolean(snapshot) };
  });
  const attempt = orderId && z.uuid().safeParse(orderId).success ? await database()("payment_attempts")
    .join("invoices", "invoices.id", "payment_attempts.invoice_id").select("payment_attempts.id", "payment_attempts.invoice_id")
    .where({ "payment_attempts.id": orderId, "invoices.client_id": billing.client.id }).first() : null;
  return <ClientPaymentsWorkspace invoices={invoices} currentId={billing.invoice ? Number(billing.invoice.id) : null}
    unlocked={billing.unlocked} active={billing.client.status === "active"} configured={sifaloConfigured()}
    returnedOrder={attempt ? { invoiceId: Number(attempt.invoice_id), orderId: String(attempt.id) } : null} />;
}

export async function LockedClientHome({ name, packageName }: { name: string; packageName?: string }) {
  const t = await getTranslations("Billing");
  return <div className="billing-locked-home"><header className="billing-heading"><div><span className="eyebrow">SOFIT</span><h1>{t("welcome", { name: name.split(" ")[0] })}</h1><p>{t("welcomeBody")}</p></div></header>
    <section className="billing-package"><span className="billing-icon"><LockKeyhole size={26} /></span><span className="eyebrow">{t("yourPackage")}</span><h2>{packageName || t("noPackage")}</h2><p className="billing-package-description">{packageName ? t("lockDescription") : t("assignmentHint")}</p><Link href="/client/payments" className="button primary">{t("viewPayment")}<ArrowUpRight size={17} /></Link></section>
    <Link href="/client/profile" className="billing-profile-link"><UserRound size={22} /><div><strong>{t("completeProfile")}</strong><p>{t("profileHint")}</p></div><ArrowUpRight size={20} /></Link>
  </div>;
}

export async function LockedProgram() {
  const t = await getTranslations("Billing");
  return <section className="billing-package billing-locked-route"><span className="billing-icon"><LockKeyhole size={26} /></span><h1>{t("lockTitle")}</h1><p>{t("lockDescription")}</p><Link href="/client/payments" className="button primary">{t("viewPayment")}<ArrowUpRight size={17} /></Link></section>;
}
