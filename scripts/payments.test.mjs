import assert from "node:assert/strict";
import { filterCoachInvoices, invoiceCsvCell, invoiceStatus } from "../src/lib/payments/coach-invoices.ts";
import { accessEnd, amountInCents, hasPaidAccess, isOpenClientPath, retryablePaymentFailure, verifiedTransaction } from "../src/lib/payments/rules.ts";

assert.equal(amountInCents("99.01"), 9901);
const unsubmitted = { status: "failed", code: 600, sid: null, response: "order_id not found" };
assert.equal(retryablePaymentFailure(unsubmitted, "ready"), true);
for (const state of ["creating", "unknown"]) assert.equal(retryablePaymentFailure(unsubmitted, state), false);
for (const change of [{ status: "pending" }, { code: "600" }, { code: 601 }, { response: "unavailable" }]) assert.equal(retryablePaymentFailure({ ...unsubmitted, ...change }, "ready"), false);
assert.equal(retryablePaymentFailure({ status: "failure", code: 600, sid: "failed-transaction" }, "unknown"), true);
assert.equal(amountInCents("0"), 0);
for (const amount of ["-1", "1.001", "1e2", "Infinity", "NaN", "99 USD", null, ""]) assert.throws(() => amountInCents(amount));
assert.equal(accessEnd(new Date("2026-01-31T12:30:00Z"), "monthly").toISOString(), "2026-02-28T12:30:00.000Z");
assert.equal(accessEnd(new Date("2028-01-31T12:30:00Z"), "monthly").toISOString(), "2028-02-29T12:30:00.000Z");
assert.equal(accessEnd(new Date("2026-11-30T12:30:00Z"), "quarterly").toISOString(), "2027-02-28T12:30:00.000Z");
assert.equal(accessEnd(new Date(), "one_time"), null);
assert.throws(() => accessEnd(new Date(), "weekly"));
const now = new Date("2026-09-10T12:30:00Z");
const invoice = { status: "paid", package_snapshot: {}, access_until: "2026-09-10T12:30:01Z" };
assert.equal(hasPaidAccess(invoice, now), true);
assert.equal(hasPaidAccess({ ...invoice, access_until: now }, now), false);
assert.equal(hasPaidAccess({ ...invoice, access_until: "invalid" }, now), false);
assert.equal(hasPaidAccess({ ...invoice, status: "unpaid" }, now), false);
assert.equal(hasPaidAccess({ ...invoice, package_snapshot: null }, now), false);
assert.equal(hasPaidAccess(null, now), false);
assert.equal(hasPaidAccess({ ...invoice, access_until: null }, now), true);
for (const path of ["/client", "/client/", "/client/payments", "/client/profile", "/client/settings"]) assert.equal(isOpenClientPath(path), true);
for (const path of ["/client/diet-plan", "/client/workout-plan", "/client/sessions", "/client/messages", "/client/check-in", "/client/progress", "/client/settings/anything"]) assert.equal(isOpenClientPath(path), false);
const success = { sid: "test-123", amount: "99.00", status: "success", code: 601 };
assert.equal(verifiedTransaction(success, "99"), "test-123");
for (const change of [{ amount: "0.99" }, { amount: "100.00" }, { currency: "SOS" }, { status: "pending" }, { status: "failure" }, { code: 600 }, { code: "601" }, { sid: "" }, { sid: "a".repeat(191) }]) {
  assert.throws(() => verifiedTransaction({ ...success, ...change }, "99"));
}
console.log("Payment rules passed: exact amounts, expiry boundaries, leap years, access gates and provider response validation.");

const coachRows = [
  { id: 1, client: "Amina", email: "amina@example.com", number: "SOF-1", packageName: "Elite", interval: "monthly", currency: "USD", status: "paid", created: "2026-09-01", due: "2026-09-01" },
  { id: 2, client: "Ali", email: "ali@example.com", number: "SOF-2", packageName: "Consultation", interval: "one_time", currency: "USD", status: "unpaid", created: "2026-09-09", due: "2026-09-10" },
  { id: 3, client: "Amina", email: "amina@example.com", number: "SOF-3", packageName: "Elite", interval: "quarterly", currency: "EUR", status: "unpaid", created: "2026-08-31", due: "2026-09-01" },
];
const filter = { search: "", status: "", interval: "", packageName: "", currency: "USD", from: "", to: "" };
const match = (changes) => filterCoachInvoices(coachRows, { ...filter, ...changes }, "2026-09-10").map((row) => row.id);
assert.deepEqual(match({}), [1, 2]);
assert.deepEqual(match({ search: " AMINA@EXAMPLE " }), [1]);
assert.deepEqual(match({ status: "paid", packageName: "Elite", interval: "monthly", from: "2026-09-01", to: "2026-09-01" }), [1]);
assert.deepEqual(match({ interval: "one_time" }), [2]);
assert.deepEqual(match({ from: "2026-09-11", to: "2026-09-01" }), []);
assert.deepEqual(match({ status: "overdue", currency: "EUR" }), [3]);
assert.equal(invoiceStatus(coachRows[0], "2026-09-10"), "paid");
assert.equal(invoiceStatus(coachRows[1], "2026-09-10"), "unpaid");
assert.equal(invoiceStatus(coachRows[1], "2026-09-11"), "overdue");
assert.equal(invoiceCsvCell('A,"B"'), '"A,""B"""');
for (const value of ["=SUM(A1)", "+cmd", "-cmd", "@cmd", "  =cmd", "\tcmd", "\rcmd"]) assert.ok(invoiceCsvCell(value).startsWith('"\''));
console.log("Coach payments passed: combined filters, currency isolation, date boundaries, overdue status and CSV formula protection.");
