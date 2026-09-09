import assert from "node:assert/strict";
import { groupPlanHistory } from "../src/lib/plan-history.ts";

const done = { key: "1", name: "Meal", day: "Monday", dates: ["2026-09-09"] };
const pending = { key: "2", name: "Meal 2", day: "Monday", dates: [] };
const base = { clientId: 1, client: "Ali", title: "Strength", version: 1, status: "active", startsOn: "2026-09-01", metric: 4 };
const plans = [
  { ...base, id: 1, items: [done, pending] },
  { ...base, id: 2, status: "archived", items: [done] },
  { ...base, id: 3, clientId: 2, items: [pending] },
  { ...base, id: 4, clientId: 3, items: [] },
];
const all = { search: "", status: "", progress: "", date: "2026-09-09" };
assert.deepEqual(groupPlanHistory(plans, all).map((g) => g.plans.map((p) => p.id)), [[1, 2], [3], [4]]);
assert.equal(groupPlanHistory(plans, { ...all, search: "  ALI " }).length, 3);
assert.equal(groupPlanHistory(plans, { ...all, search: "strength" }).length, 3);
assert.deepEqual(groupPlanHistory(plans, { ...all, status: "archived" })[0].plans.map((p) => p.id), [2]);
assert.deepEqual(groupPlanHistory(plans, { ...all, progress: "done" })[0].plans.map((p) => p.id), [1, 2]);
assert.deepEqual(groupPlanHistory(plans, { ...all, progress: "pending" }).map((g) => g.plans.map((p) => p.id)), [[1], [3]]);
assert.deepEqual(groupPlanHistory(plans, { ...all, progress: "done", date: "2026-09-08" }), []);
assert.deepEqual(groupPlanHistory(plans, { ...all, status: "archived", progress: "pending" }), []);
assert.deepEqual(groupPlanHistory([], all), []);
assert.equal(plans.length, 4);
console.log("Plan history grouping and filters passed.");
