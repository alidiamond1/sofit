"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/auth/session";
import { database } from "@/lib/db";
import { activateInvoice, BillingError, loadBilling, snapshotOf } from "@/lib/payments/billing";
import { accessEnd, verifiedTransaction } from "@/lib/payments/rules";
import { checkoutUrl, paymentReturnUrl, sifaloConfigured, sifaloRequest } from "@/lib/payments/sifalo";

export type PaymentResult = { error?: string; message?: string; url?: string; paid?: boolean };
const invoiceIdSchema = z.number().int().positive();
const orderIdSchema = z.uuid();
function paymentError(error: unknown): PaymentResult {
  return { error: error instanceof BillingError ? error.message : "We could not confirm this payment. Your access has not changed. Check payment status before paying again." };
}
function refreshPayments() {
  revalidatePath("/client", "layout");
  revalidatePath("/coach", "layout");
}

export async function startCheckoutAction(invoiceId: number): Promise<PaymentResult> {
  const session = await requireRole("client");
  if (!invoiceIdSchema.safeParse(invoiceId).success) return { error: "Invalid invoice." };
  if (!sifaloConfigured()) return { error: "Online payment is being set up. Please try again later." };
  await loadBilling(session.id);
  let createdOrder: string | undefined;
  try {
    const reserved = await database().transaction(async (trx) => {
      const client = await trx("clients").where({ user_id: session.id, status: "active" }).forUpdate().first();
      if (!client || Number(client.current_invoice_id) !== invoiceId) throw new BillingError("This is not your current package invoice.");
      const invoice = await trx("invoices").where({ id: invoiceId, client_id: client.id }).forUpdate().first();
      if (!invoice?.package_snapshot || !["unpaid", "overdue"].includes(invoice.status)) throw new BillingError("This invoice is not awaiting payment.");
      const last = await trx("payment_attempts").where({ invoice_id: invoiceId }).orderBy("created_at", "desc").first();
      if (last && last.status !== "failed") {
        if (last.status === "ready" && last.checkout_url) return { url: String(last.checkout_url), orderId: null, amount: "" };
        throw new BillingError("A payment is already in progress. Use Check payment status before starting another.");
      }
      const orderId = randomUUID();
      // Validate configuration before reserving an attempt.
      paymentReturnUrl(orderId);
      await trx("payment_attempts").insert({ id: orderId, invoice_id: invoiceId, status: "creating" });
      return { orderId, amount: String(invoice.amount), url: null };
    });
    if (reserved.url) return { url: reserved.url };
    createdOrder = reserved.orderId!;
    const result = await sifaloRequest("", { amount: reserved.amount, gateway: "checkout", currency: "USD", return_url: paymentReturnUrl(createdOrder) });
    const url = checkoutUrl(result);
    await database()("payment_attempts").where({ id: createdOrder, status: "creating" }).update({ checkout_url: url, status: "ready", updated_at: new Date() });
    return { url };
  } catch (error) {
    // A timeout does not mean payment creation failed. Keep the same order for
    // reconciliation instead of creating another charge on the next click.
    if (createdOrder) await database()("payment_attempts").where({ id: createdOrder, status: "creating" }).update({ status: "unknown", updated_at: new Date() });
    return paymentError(error);
  }
}

export async function verifyPaymentAction(invoiceId: number, orderId?: string): Promise<PaymentResult> {
  const session = await requireRole("client");
  if (!invoiceIdSchema.safeParse(invoiceId).success || (orderId !== undefined && !orderIdSchema.safeParse(orderId).success)) return { error: "Invalid payment reference." };
  try {
    const reserved = await database().transaction(async (trx) => {
      const client = await trx("clients").where({ user_id: session.id }).forUpdate().first();
      if (!client) throw new BillingError("Client profile not found.");
      const invoice = await trx("invoices").where({ id: invoiceId, client_id: client.id }).forUpdate().first();
      if (!invoice?.package_snapshot) throw new BillingError("Invoice not found.");
      if (invoice.status === "paid") return { invoice, attempt: null };
      if (!["unpaid", "overdue"].includes(invoice.status)) throw new BillingError("This invoice is not payable.");
      const query = trx("payment_attempts").where({ invoice_id: invoiceId });
      if (orderId) query.where({ id: orderId });
      const attempt = await query.orderBy("created_at", "desc").forUpdate().first();
      if (!attempt) throw new BillingError("No checkout has been started for this invoice.");
      if (attempt.checked_at && Date.now() - new Date(attempt.checked_at).getTime() < 15_000) throw new BillingError("Please wait a few seconds before checking again.");
      await trx("payment_attempts").where({ id: attempt.id }).update({ checked_at: new Date() });
      return { invoice, attempt };
    });
    if (!reserved.attempt) return { paid: true, message: "Payment confirmed." };
    // Ignore the return URL's sid/status/amount. Query the provider using only
    // the unpredictable order_id we previously stored for this owned invoice.
    const verified = await sifaloRequest("verify.php", { order_id: String(reserved.attempt.id) });
    if (verified.status === "pending") return { message: "Your payment is still pending. Check again shortly; do not pay twice." };
    if (verified.status === "failure" && typeof verified.sid === "string" && verified.sid && verified.code !== 601) {
      await database()("payment_attempts").where({ id: reserved.attempt.id }).whereNot({ status: "paid" }).update({ status: "failed", checkout_url: null, updated_at: new Date() });
      return { error: "Sifalo reports that this payment failed. You can try checkout again." };
    }
    const sid = verifiedTransaction(verified, reserved.invoice.amount);
    await database().transaction(async (trx) => {
      const client = await trx("clients").where({ user_id: session.id }).forUpdate().first();
      const invoice = await trx("invoices").where({ id: invoiceId, client_id: client.id }).forUpdate().first();
      if (invoice.status === "paid") return;
      if (!["unpaid", "overdue"].includes(invoice.status)) throw new BillingError("This invoice can no longer be settled automatically.");
      const now = new Date();
      const isCurrent = Number(client.current_invoice_id) === invoiceId;
      await trx("invoices").where({ id: invoiceId }).update({
        status: "paid", provider_sid: sid, paid_at: now,
        access_until: accessEnd(now, snapshotOf(invoice.package_snapshot).interval), updated_at: now,
      });
      // provider_sid has a unique DB constraint: a replay across accounts or
      // invoices rolls back the entire transaction, including plan activation.
      if (isCurrent) await activateInvoice(trx, invoice, now);
      await trx("payment_attempts").where({ id: reserved.attempt.id }).update({ status: "paid", checkout_url: null, updated_at: now });
    });
    refreshPayments();
    return { paid: true, message: "Payment recorded. Your current package access has been updated where applicable." };
  } catch (error) {
    return paymentError(error);
  }
}
