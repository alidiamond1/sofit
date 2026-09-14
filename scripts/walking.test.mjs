import assert from "node:assert/strict";
import { walkingDays, walkingTargetOn, walkingTargetForDay, walkingTargetFromRow, shiftWalkingDate, validWalkingAmount, walkingTargetSchema, walkingLogSchema } from "../src/lib/walking.ts";

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
  ["pending", 50], ["below", 0], ["met", 100], ["met", 100], ["missing", 0],
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
assert.ok(walkingLogSchema.safeParse({ date: "2026-09-14", amount: "0", targetId: 1, notes: "" }).success);
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
