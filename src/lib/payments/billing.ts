import "server-only";
import { randomUUID } from "node:crypto";
import type { Knex } from "knex";
import { redirect } from "next/navigation";
import { cache } from "react";
import { database } from "@/lib/db";
import { todayISO } from "@/lib/schedule";
import { accessEnd, amountInCents, hasPaidAccess } from "./rules";

type GroupDay = { dayIndex: number; dayLabel: string; meals?: unknown[]; exercises?: unknown[] };
export type PackageSnapshot = {
  name: string; description: string; category: string; interval: string;
  dietDays: GroupDay[]; workoutDays: GroupDay[];
};
export class BillingError extends Error {}

export function snapshotOf(value: unknown): PackageSnapshot {
  return (typeof value === "string" ? JSON.parse(value) : value) as PackageSnapshot;
}

async function packageSnapshot(trx: Knex.Transaction, pkg: Record<string, unknown>): Promise<PackageSnapshot> {
  const [diet, workout] = await Promise.all([
    pkg.diet_group_id ? trx("diet_groups").where({ id: pkg.diet_group_id }).first() : null,
    pkg.workout_group_id ? trx("workout_groups").where({ id: pkg.workout_group_id }).first() : null,
  ]);
  const days = (value: unknown): GroupDay[] => {
    const parsed = typeof value === "string" ? JSON.parse(value) : value;
    return Array.isArray(parsed) ? parsed : [];
  };
  return {
    name: String(pkg.name), description: String(pkg.description || ""), category: String(pkg.category),
    interval: String(pkg.billing_interval), dietDays: days(diet?.days), workoutDays: days(workout?.days),
  };
}

async function createInvoice(trx: Knex.Transaction, clientId: number, packageId: number, amount: string, snapshot: PackageSnapshot) {
  amountInCents(amount);
  accessEnd(new Date(), snapshot.interval);
  const [id] = await trx("invoices").insert({
    client_id: clientId, package_id: packageId, number: `SOF-${randomUUID()}`,
    amount, currency: "USD", status: "unpaid", due_on: new Date(),
    package_snapshot: JSON.stringify(snapshot),
  });
  await trx("clients").where({ id: clientId }).update({ package_id: packageId, current_invoice_id: id, updated_at: trx.fn.now() });
  return trx("invoices").where({ id }).first();
}

/** Caller holds the client row lock. Issued checkout amounts and paid history stay immutable. */
export async function syncUnpaidPackageInvoice(trx: Knex.Transaction, invoice: Record<string, unknown>, pkg: Record<string, unknown>) {
  if (!["unpaid", "overdue"].includes(String(invoice.status))) return invoice;
  const previous = snapshotOf(invoice.package_snapshot);
  if (amountInCents(invoice.amount) === amountInCents(pkg.price) && previous.interval === pkg.billing_interval) return invoice;
  const snapshot = { ...previous, interval: String(pkg.billing_interval) };
  const attempt = await trx("payment_attempts").select("id").where({ invoice_id: invoice.id }).first();
  if (attempt) {
    // A provider token may still contain the old amount. Keep that invoice for
    // reconciliation and issue a distinct invoice/order for the new price.
    return createInvoice(trx, Number(invoice.client_id), Number(pkg.id), String(pkg.price), snapshot);
  }
  const change = { amount: String(pkg.price), package_snapshot: JSON.stringify(snapshot), client_viewed_at: null, updated_at: new Date() };
  await trx("invoices").where({ id: invoice.id }).update(change);
  return { ...invoice, ...change };
}

/** Caller holds the client row lock. */
export async function assignPricedPackage(trx: Knex.Transaction, clientId: number, packageId: number) {
  const client = await trx("clients").where({ id: clientId }).forUpdate().first();
  const user = client && await trx("users").where({ id: client.user_id, role: "client", is_active: true, approval_status: "approved" }).first();
  if (!user || client.status !== "active") throw new BillingError("Approve and activate this client before assigning a package.");
  const pkg = await trx("packages").where({ id: packageId, is_active: true }).first();
  if (!pkg) throw new BillingError("That package is not available.");
  const current = client.current_invoice_id && await trx("invoices").where({ id: client.current_invoice_id }).first();
  if (Number(client.package_id) === packageId && current) {
    if (hasPaidAccess(current)) return current;
    if (["unpaid", "overdue"].includes(current.status)) return syncUnpaidPackageInvoice(trx, current, pkg);
  }
  const snapshot = await packageSnapshot(trx, pkg);
  if (!snapshot.dietDays.some((day) => day.meals?.length) && !snapshot.workoutDays.some((day) => day.exercises?.length)) {
    throw new BillingError("Add content to this package's diet or workout group before assigning it.");
  }
  // Preserve old invoices and in-flight attempts for reconciliation, but they can
  // never unlock a replacement: access always checks clients.current_invoice_id.
  return createInvoice(trx, clientId, packageId, String(pkg.price), snapshot);
}

/** Only called after the provider verifies payment (or a server-priced free package). */
export async function activateInvoice(trx: Knex.Transaction, invoice: Record<string, unknown>, now: Date) {
  const snapshot = snapshotOf(invoice.package_snapshot);
  const settings = await trx("user_settings").join("clients", "clients.user_id", "user_settings.user_id")
    .select("user_settings.timezone").where("clients.id", Number(invoice.client_id)).first();
  const today = todayISO(String(settings?.timezone || "Africa/Nairobi"));
  let dietPlanId: number | null = null;
  let workoutPlanId: number | null = null;
  for (const table of ["diet_plans", "workout_plans"]) {
    await trx(table).where({ client_id: invoice.client_id, status: "active" }).update({ status: "archived" });
  }
  if (snapshot.dietDays.some((day) => day.meals?.length)) {
    const latest = await trx("diet_plans").where({ client_id: invoice.client_id, title: snapshot.name }).max({ version: "version" }).first();
    [dietPlanId] = await trx("diet_plans").insert({
      client_id: invoice.client_id, invoice_id: invoice.id, title: snapshot.name,
      version: Number(latest?.version || 0) + 1, days: JSON.stringify(snapshot.dietDays),
      food_swaps: JSON.stringify([]), status: "active", starts_on: today,
    });
  }
  if (snapshot.workoutDays.some((day) => day.exercises?.length)) {
    const latest = await trx("workout_plans").where({ client_id: invoice.client_id, title: snapshot.name }).max({ version: "version" }).first();
    [workoutPlanId] = await trx("workout_plans").insert({
      client_id: invoice.client_id, invoice_id: invoice.id, title: snapshot.name,
      version: Number(latest?.version || 0) + 1, weeks: snapshot.interval === "quarterly" ? 13 : 4,
      exercises: JSON.stringify(snapshot.workoutDays.flatMap((day) => day.exercises || [])),
      weekly_split: JSON.stringify(snapshot.workoutDays.filter((day) => day.exercises?.length).map((day) => day.dayLabel)),
      status: "active", starts_on: today,
    });
  }
  for (let weekday = 0; weekday < 7; weekday += 1) {
    const diet = snapshot.dietDays.find((day) => day.dayIndex === weekday && day.meals?.length);
    const workout = snapshot.workoutDays.find((day) => day.dayIndex === weekday && day.exercises?.length);
    const slot = { is_rest: !diet && !workout, diet_plan_id: diet ? dietPlanId : null, workout_plan_id: workout ? workoutPlanId : null, workout_day: workout?.dayLabel || null };
    await trx("client_week_schedule").insert({ client_id: invoice.client_id, weekday, ...slot }).onConflict(["client_id", "weekday"]).merge(slot);
  }
  await trx("clients").where({ id: invoice.client_id }).update({ pipeline_stage: "active", updated_at: now });
}

export async function loadBilling(userId: number) {
  return database().transaction(async (trx) => {
    const client = await trx("clients").where({ user_id: userId }).forUpdate().first();
    if (!client) throw new BillingError("Client profile not found.");
    let invoice = client.current_invoice_id ? await trx("invoices").where({ id: client.current_invoice_id, client_id: client.id }).first() : null;
    // Existing package labels become unpaid invoices; legacy/demo paid invoices
    // are not proof that a particular package was purchased.
    if (!invoice && client.package_id && client.status === "active") {
      const pkg = await trx("packages").where({ id: client.package_id }).first();
      if (pkg) invoice = await createInvoice(trx, client.id, pkg.id, String(pkg.price), await packageSnapshot(trx, pkg));
    }
    const now = new Date();
    const currentPackage = invoice?.package_id ? await trx("packages").where({ id: invoice.package_id }).first() : null;
    if (invoice?.package_snapshot && currentPackage) invoice = await syncUnpaidPackageInvoice(trx, invoice, currentPackage);
    if (invoice?.status === "paid" && invoice.access_until && new Date(invoice.access_until) <= now && client.status === "active") {
      const snapshot = snapshotOf(invoice.package_snapshot);
      invoice = await createInvoice(trx, client.id, invoice.package_id, String(currentPackage?.price ?? invoice.amount), { ...snapshot, interval: currentPackage?.billing_interval || snapshot.interval });
    }
    if (invoice?.status === "unpaid" && amountInCents(invoice.amount) === 0 && client.status === "active") {
      await activateInvoice(trx, invoice, now);
      const until = accessEnd(now, snapshotOf(invoice.package_snapshot).interval);
      await trx("invoices").where({ id: invoice.id }).update({ status: "paid", paid_at: now, access_until: until });
      invoice = { ...invoice, status: "paid", paid_at: now, access_until: until };
    }
    return { client, invoice, unlocked: client.status === "active" && hasPaidAccess(invoice, now) };
  });
}

export async function requirePaidClient(userId: number) {
  const billing = await loadBilling(userId);
  if (!billing.unlocked) redirect("/client/payments?locked=1");
  return billing;
}

// Share reads within a single server render. Actions use uncached loadBilling.
export const getBilling = cache(loadBilling);
