// Sifalo's live Verify API returns this for a checkout with no submitted transaction.
// Only a successfully created checkout may be retried; a creation timeout is ambiguous.
export function retryablePaymentFailure(result: Record<string, unknown>, attemptStatus: string): boolean {
  if (!["failure", "failed"].includes(String(result.status)) || result.code !== 600) return false;
  if (typeof result.sid === "string" && result.sid.trim()) return true;
  return attemptStatus === "ready" && result.sid == null && result.response === "order_id not found";
}

export function amountInCents(value: unknown): number {
  const text = String(value);
  if (!/^\d{1,7}(\.\d{1,2})?$/.test(text)) throw new Error("Invalid USD amount.");
  const [whole, fraction = ""] = text.split(".");
  return Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
}

export function accessEnd(start: Date, interval: string): Date | null {
  if (interval === "one_time") return null;
  if (interval !== "monthly" && interval !== "quarterly") throw new Error("Invalid billing interval.");
  const end = new Date(start);
  const day = end.getUTCDate();
  end.setUTCDate(1);
  end.setUTCMonth(end.getUTCMonth() + (interval === "monthly" ? 1 : 3));
  const lastDay = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth() + 1, 0)).getUTCDate();
  end.setUTCDate(Math.min(day, lastDay));
  return end;
}

export function hasPaidAccess(invoice: { status: string; package_snapshot: unknown; access_until: Date | string | null } | null | undefined, now = new Date()) {
  return Boolean(invoice?.package_snapshot && invoice.status === "paid" &&
    (invoice.access_until === null || new Date(invoice.access_until).getTime() > now.getTime()));
}

export function isOpenClientPath(path: string) {
  return ["/client", "/client/payments", "/client/profile", "/client/settings"].includes(path.replace(/\/$/, ""));
}

// Sifalo currently documents USD-only checkout. Verify by our stored order_id,
// never a sid supplied by the browser: sid alone does not bind a payment to an order.
export function verifiedTransaction(value: unknown, expectedAmount: unknown) {
  if (!value || typeof value !== "object") throw new Error("Invalid payment response.");
  const row = value as Record<string, unknown>;
  if (row.status !== "success" || row.code !== 601 || typeof row.sid !== "string" ||
      !/^[\x21-\x7e]{1,190}$/.test(row.sid) ||
      (row.currency !== undefined && row.currency !== "USD") ||
      amountInCents(row.amount) !== amountInCents(expectedAmount)) {
    throw new Error("Payment could not be verified.");
  }
  return row.sid;
}
