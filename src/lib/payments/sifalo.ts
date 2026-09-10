import "server-only";
import { BillingError } from "./billing";

// Contract: https://developer.sifalopay.com/sifalo-pay-checkout
export function sifaloConfigured() {
  return Boolean(process.env.SIFALO_API_USERNAME && process.env.SIFALO_API_PASSWORD);
}

export async function sifaloRequest(path: "" | "verify.php", body: Record<string, string>): Promise<Record<string, unknown>> {
  if (!sifaloConfigured()) throw new BillingError("Online payment is being set up. Please try again later.");
  const auth = Buffer.from(`${process.env.SIFALO_API_USERNAME}:${process.env.SIFALO_API_PASSWORD}`).toString("base64");
  const response = await fetch(`https://api.sifalopay.com/gateway/${path}`, {
    method: "POST", headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/json" },
    body: JSON.stringify(body), cache: "no-store", redirect: "error", signal: AbortSignal.timeout(12_000),
  });
  if (!response.ok) throw new BillingError("Sifalo is unavailable. Check payment status before trying again.");
  const data: unknown = await response.json();
  if (!data || typeof data !== "object" || Array.isArray(data)) throw new Error("Invalid provider response.");
  return data as Record<string, unknown>;
}

export function paymentReturnUrl(orderId: string) {
  const base = new URL(process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000");
  if (base.protocol !== "https:" && !(process.env.NODE_ENV !== "production" && base.hostname === "localhost")) {
    throw new BillingError("The payment return URL must use HTTPS.");
  }
  const url = new URL("/client/payments", base);
  url.searchParams.set("order_id", orderId);
  return url.href;
}

export function checkoutUrl(data: Record<string, unknown>) {
  if (typeof data.key !== "string" || typeof data.token !== "string" || !data.key || !data.token || data.key.length > 4096 || data.token.length > 4096) {
    throw new Error("Invalid checkout response.");
  }
  const url = new URL("https://pay.sifalo.com/checkout/");
  url.searchParams.set("key", data.key);
  url.searchParams.set("token", data.token);
  return url.href;
}
