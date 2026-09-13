import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import * as rules from "../src/lib/payments/rules.ts";

// Run the real approval and billing functions against a transactional in-memory store.
const require = createRequire(import.meta.url);
let data;
let authorized = true;
const refreshed = [];
function transactionTable(table) {
  let filter = {};
  const rows = () => data[table].filter((row) => Object.entries(filter).every(([key, value]) => row[key] === value));
  return {
    where(value) { filter = { ...filter, ...value }; return this; },
    select() { return this; },
    forUpdate() { return this; },
    async first() { return rows()[0]; },
    async update(value) { rows().forEach((row) => Object.assign(row, value)); },
    async insert(value) { const id = data[table].length + 1; data[table].push({ id, ...value }); return [id]; },
  };
}
transactionTable.fn = { now: () => new Date() };
const db = {
  async transaction(callback) {
    const before = structuredClone(data);
    try { return await callback(transactionTable); }
    catch (error) { data = before; throw error; }
  },
};
function load(path, dependencies) {
  const source = readFileSync(new URL(path, import.meta.url), "utf8");
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;
  const exports = {};
  runInNewContext(code, { exports, require: (name) => name in dependencies ? dependencies[name] : require(name), Date });
  return exports;
}
const billing = load("../src/lib/payments/billing.ts", {
  "server-only": {}, "next/navigation": {}, react: { cache: (fn) => fn },
  "@/lib/db": { database: () => db }, "@/lib/schedule": {}, "./rules": rules,
});
const { approveApplicationAction } = load("../src/app/actions/onboarding.ts", {
  "next/headers": {}, "next/navigation": {}, "next/cache": { revalidatePath: (path) => refreshed.push(path) },
  "@/lib/auth/session": { requireRole: async (role) => { assert.equal(role, "coach"); if (!authorized) throw new Error("Unauthorized"); return { id: 9 }; } },
  "@/lib/db": { database: () => db }, "@/lib/onboarding/invites": {},
  "@/lib/onboarding/intake-fields": {}, "@/lib/payments/billing": billing,
});
function reset() {
  data = {
    invites: [{ id: 1, user_id: 2, status: "submitted" }],
    users: [{ id: 2, name: "Test Client", role: "client", is_active: true, approval_status: "pending" }],
    clients: [{ id: 3, user_id: 2, status: "paused", pipeline_stage: "onboarding" }],
    packages: [{ id: 4, name: "Gold", price: "99.95", billing_interval: "quarterly", is_active: true, diet_group_id: 5 }],
    diet_groups: [{ id: 5, days: JSON.stringify([{ dayIndex: 0, meals: [{ name: "Breakfast" }] }]) }],
    invoices: [], messages: [], notifications: [], payment_attempts: [],
  };
}
function approve(packageId = "4", inviteId = "1") {
  const form = new FormData();
  form.set("invite_id", inviteId);
  form.set("package_id", packageId);
  form.set("price", "0.01"); // Client-supplied amounts must never price the invoice.
  return approveApplicationAction({}, form);
}
reset();
authorized = false;
await assert.rejects(approve(), /Unauthorized/);
authorized = true;
for (const id of ["", "0", "-1", "1.5", "invalid", "999"]) {
  const before = structuredClone(data);
  assert.ok((await approve(id)).error);
  assert.deepEqual(data, before);
}
for (const change of [
  () => { data.packages[0].is_active = false; },
  () => { data.diet_groups[0].days = "[]"; },
  () => { data.invites[0].status = "expired"; },
  () => { data.invites[0].user_id = null; },
]) {
  reset(); change();
  const before = structuredClone(data);
  assert.ok((await approve()).error);
  assert.deepEqual(data, before, "Failed assignment must roll back approval and welcome records.");
}
reset();
assert.ok((await approve()).success);
assert.equal(data.users[0].approval_status, "approved");
assert.equal(data.clients[0].status, "active");
assert.equal(data.clients[0].package_id, 4);
assert.equal(data.clients[0].current_invoice_id, data.invoices[0].id);
assert.equal(data.invites[0].status, "approved");
assert.equal(data.invoices[0].amount, "99.95");
assert.equal(data.invoices[0].status, "unpaid");
assert.equal(JSON.parse(data.invoices[0].package_snapshot).interval, "quarterly");
assert.ok((await approve()).success);
assert.equal(data.invoices.length, 1);
assert.equal(data.messages.length, 1);
assert.equal(data.notifications.length, 1);
data.packages.push({ ...data.packages[0], id: 6, name: "Elite", price: "125.50" });
assert.ok((await approve("6")).success);
assert.equal(data.clients[0].package_id, 6);
assert.equal(data.invoices.length, 2);
assert.equal(data.invoices[1].amount, "125.50");
assert.equal(data.messages.length, 1);
for (const path of ["/coach/clients", "/coach/packages", "/coach/payments", "/client", "/coach/invites/1"]) assert.ok(refreshed.includes(path));
console.log("Approval passed: authorization, validation, rollback, priced assignment, invoice reuse and package changes.");
