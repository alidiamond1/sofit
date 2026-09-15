import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import * as walking from "../src/lib/walking.ts";
import { walkingDays, walkingTargetOn, walkingTargetForDay, walkingTargetFromRow, shiftWalkingDate, validWalkingAmount, walkingTargetSchema, walkingLogSchema, walkingLogTotal } from "../src/lib/walking.ts";

const steps = { id: 1, unit: "steps", amount: 10000, startsOn: "2026-09-01", active: true, notes: "" };
const km = { ...steps, id: 2, unit: "km", amount: 5, startsOn: "2026-09-12" };
const pause = { ...km, id: 3, startsOn: "2026-09-15", active: false };
const targets = [pause, steps, km];
assert.equal(walkingTargetOn(targets, "2026-08-31"), undefined);
assert.equal(walkingTargetOn(targets, "2026-09-11").unit, "steps");
assert.equal(walkingTargetOn(targets, "2026-09-12").unit, "km");
assert.equal(walkingTargetOn(targets, "2026-09-15").active, false);
const days = walkingDays(targets, [
  { date: "2026-09-14", amount: 2.5, notes: "" },
  { date: "2026-09-13", amount: 0, notes: "" },
  { date: "2026-09-12", amount: 6, notes: "" },
  { date: "2026-09-11", amount: 10000, notes: "" },
], "2026-09-14");
assert.deepEqual(days.slice(0, 5).map(({ status, percent }) => [status, percent]), [
  ["pending", 50], ["below", 0], ["met", 120], ["met", 100], ["missing", 0],
]);
assert.equal(days[3].target.amount, 10000, "Changing units must preserve historical targets");
assert.equal(walkingDays(targets, [], "2026-09-16")[0].date, "2026-09-14", "Paused days must not count as missing");
assert.equal(walkingDays([steps], [], "2026-10-01").length, 30);
assert.equal(walkingDays([], [], "2026-10-01").length, 0);
assert.equal(shiftWalkingDate("2026-01-01", -1), "2025-12-31");
assert.equal(shiftWalkingDate("2024-03-01", -1), "2024-02-29");
for (const amount of [-1, 0.5, 100001, Infinity, NaN]) assert.equal(validWalkingAmount(amount, "steps"), false);
for (const amount of [-1, 1.001, 101, Infinity, NaN]) assert.equal(validWalkingAmount(amount, "km"), false);
for (const amount of [0, 10000, 100000]) assert.equal(validWalkingAmount(amount, "steps"), true);
for (const amount of [0, 0.01, 5.55, 100]) assert.equal(validWalkingAmount(amount, "km"), true);
const input = { clientId: 1, unit: "steps", amount: 10000, startsOn: "2026-09-14", active: true, notes: "", dailyTargets: [10000, null, 7000, 8000, 10000, null, 12000] };
assert.ok(walkingTargetSchema.safeParse(input).success);
for (const patch of [{ amount: 0 }, { amount: "" }, { unit: "miles" }, { startsOn: "2026-02-30" }, { clientId: -1 }]) {
  assert.equal(walkingTargetSchema.safeParse({ ...input, ...patch }).success, false);
}
assert.ok(walkingLogSchema.safeParse({ date: "2026-09-14", amount: "0", targetId: 1, notes: "", mode: "add", expectedAmount: 0 }).success);
assert.equal(walkingLogSchema.safeParse({ date: "2026-09-14", amount: "", targetId: 1, notes: "" }).success, false);
const weekly = { ...steps, id: 10, startsOn: input.startsOn, dailyTargets: input.dailyTargets };
assert.equal(walkingTargetForDay([steps, weekly], "2026-09-14").amount, 10000);
assert.equal(walkingTargetForDay([steps, weekly], "2026-09-15"), undefined, "Rest days must not fall back to an older ongoing target");
assert.equal(walkingTargetForDay([steps, weekly], "2026-09-16").amount, 7000);
assert.equal(walkingTargetForDay([steps, weekly], "2026-09-20").amount, 12000);
assert.equal(walkingTargetForDay([steps, weekly], "2026-09-21"), undefined, "A seven-day plan must end after day seven");
assert.equal(walkingDays([weekly], [], "2026-09-21").length, 5, "Only assigned walking days count toward adherence");
for (const dailyTargets of [[], [null], [-1], [0.5], Array(91).fill(10000)]) {
  assert.equal(walkingTargetSchema.safeParse({ ...input, dailyTargets }).success, false);
}
assert.ok(walkingTargetSchema.safeParse({ ...input, unit: "km", amount: 5, dailyTargets: [2.5, null, 5.75] }).success);
assert.equal(walkingTargetFromRow({ id: 10, unit: "steps", amount: "10000.00", starts_on: new Date(2026, 8, 14), active: 1, daily_targets: JSON.stringify(input.dailyTargets) }).startsOn, "2026-09-14");
assert.deepEqual(walkingTargetFromRow({ id: 10, starts_on: "2026-09-14", daily_targets: input.dailyTargets }).dailyTargets, input.dailyTargets);
console.log("Walking validation, daily accounting, unit changes, pauses and dates passed.");
assert.equal(walkingLogTotal(2000, 3000, "add", "steps"), 5000);
assert.equal(walkingLogTotal(5000, 6000, "add", "steps"), 11000, "Walking may exceed the prescribed target");
assert.equal(walkingLogTotal(11000, 4000, "replace", "steps"), 4000, "Correction replaces instead of adding");
assert.equal(walkingLogTotal(4000, 0, "replace", "steps"), 0);
assert.equal(walkingLogTotal(0.1, 0.2, "add", "km"), 0.3);
assert.equal(walkingLogTotal(99000, 2000, "add", "steps"), null);
assert.equal(walkingLogTotal(99, 2, "add", "km"), null);
assert.equal(walkingLogTotal(2000, -10, "add", "steps"), null);
assert.equal(walkingLogTotal(2000, 0.5, "add", "steps"), null);
assert.equal(walkingLogSchema.safeParse({ date: "2026-09-14", amount: "2000", targetId: 1, notes: "", mode: "delete", expectedAmount: 0 }).success, false);
console.log("Additive walks, corrections, over-target totals, and daily limits passed.");

// Exercise the actual server action with an isolated store, never the client's records.
let saved;
let paid = true;
const refreshed = [];
function table(name) {
  const filters = {};
  return {
    where(key, operator, value) { if (typeof key === "object") Object.assign(filters, key); else if (operator !== "<=") filters[key] = value; return this; },
    select() { return this; }, forUpdate() { return this; }, orderBy() { return this; },
    async first() {
      if (name === "clients") { assert.equal(filters.user_id, 7); return { id: 9 }; }
      if (name === "user_settings") return { timezone: "Africa/Nairobi" };
      assert.equal(filters.client_id, 9, "Always scope walking records to the authenticated client");
      if (name === "walking_targets") return { id: 1, starts_on: "2026-09-01", amount: 10000, unit: "steps", active: 1 };
      return saved;
    },
    insert(value) { return { onConflict() { return { async merge() { saved = value; } }; } }; },
  };
}
table.fn = { now: () => new Date() };
let queue = Promise.resolve();
const db = { transaction(fn) { const next = queue.then(() => fn(table)); queue = next.catch(() => {}); return next; } };
const exports = {};
const dependencies = {
  "next/cache": { revalidatePath: (path) => refreshed.push(path) },
  "@/lib/auth/session": { requireRole: async (role) => { assert.equal(role, "client"); return { id: 7 }; } },
  "@/lib/payments/billing": { requirePaidClient: async () => { if (!paid) throw new Error("Payment required"); } },
  "@/lib/db": { database: () => db }, "@/lib/schedule": { todayISO: () => "2026-09-15" }, "@/lib/walking": walking,
};
runInNewContext(ts.transpileModule(readFileSync(new URL("../src/app/actions/walking.ts", import.meta.url), "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText,
  { exports, require: (name) => { assert.ok(name in dependencies, name); return dependencies[name]; } });
function log(amount, expected = 0, mode = "add", patch = {}) {
  const form = new FormData();
  Object.entries({ amount, expected_amount: expected, mode, date: "2026-09-15", target_id: 1, notes: "", ...patch }).forEach(([key, value]) => form.set(key, String(value)));
  return exports.saveWalkingLogAction({}, form);
}
assert.equal((await log(2000)).total, 2000);
assert.equal((await log(3000, 2000)).total, 5000);
assert.equal((await log(3000, 2000)).error, "logChanged", "A repeated submission cannot add the same walk twice");
assert.equal((await log(6000, 5000)).total, 11000);
assert.equal((await log(4000, 11000, "replace")).total, 4000);
const results = await Promise.all([log(1000, 4000), log(2000, 4000)]);
assert.equal(results.filter((result) => result.success).length, 1);
assert.equal(results.filter((result) => result.error === "logChanged").length, 1);
assert.equal(saved.amount, 5000, "A stale tab must not lose another walk");
assert.equal((await log(-1, 5000)).error, "invalidLog");
assert.equal((await log(1, 5000, "add", { target_id: 999 })).error, "targetChanged");
assert.equal((await log(1, 5000, "add", { date: "2026-09-16" })).error, "invalidDate");
assert.equal((await log(1, 5000, "add", { date: "2026-08-01" })).error, "invalidDate");
assert.equal((await log(96000, 5000)).error, "invalidLog");
paid = false;
await assert.rejects(log(1, 5000), /Payment required/);
assert.equal(saved.amount, 5000);
assert.ok(refreshed.includes("/client/health"));
console.log("Walking action: ownership, paid access, add/correct, stale writes, replay and bounds passed.");

const summary = walking.summarizeWalking([
  { today: "2026-09-16", targets: [{ ...steps, startsOn: "2026-09-14", dailyTargets: [10000, 10000] }], logs: [{ date: "2026-09-14", amount: 12000, notes: "" }, { date: "2026-09-15", amount: 0, notes: "" }] },
  { today: "2026-09-15", targets: [{ ...km, startsOn: "2026-09-14", dailyTargets: [3, 3] }], logs: [{ date: "2026-09-15", amount: 5, notes: "" }] },
  { today: "2026-09-15", targets: [{ ...steps, startsOn: "2026-09-14", dailyTargets: [5000] }], logs: [{ date: "2026-09-14", amount: 1000, notes: "" }] },
  { today: "2026-09-16", targets: [{ ...pause, startsOn: "2026-09-01" }], logs: [] },
]);
assert.deepEqual(summary.outcomes, { met: 1, below: 2, missing: 1 });
assert.equal(summary.completedDays, 4, "Use each client's local today and exclude rest/paused days");
assert.equal(summary.adherence, 25);
assert.equal(summary.participatingClients, 3);
assert.deepEqual(summary.steps[0], { date: "2026-09-14", actual: 13000, target: 15000 });
assert.equal(summary.steps[1].actual, 0, "Recorded zero is real data");
assert.equal(summary.km[0].actual, null, "Missing logs must not become recorded zeros");
assert.equal(summary.km[1].actual, 5, "Do not mix kilometres into steps");
assert.equal(walking.summarizeWalking([]).adherence, null);
console.log("Coach walking aggregates: local-day cutoffs, outcomes, units, missing data and totals passed.");
