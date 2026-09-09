import assert from "node:assert/strict";
import { filterCheckIns } from "../src/lib/check-in-filters.ts";

const rows = [
  { client: "Maryama Ali", status: "submitted", weekOf: "2026-08-31" },
  { client: "Maryama Ali", status: "reviewed", weekOf: "2026-07-20" },
  { client: "Abdirahman Ali", status: "pending", weekOf: "2026-08-03" },
];
const all = { search: "", status: "", month: "" };
assert.deepEqual(filterCheckIns(rows, all), rows);
assert.deepEqual(filterCheckIns(rows, { ...all, search: "  MARYAMA " }), rows.slice(0, 2));
assert.deepEqual(filterCheckIns(rows, { ...all, status: "pending" }), [rows[2]]);
assert.deepEqual(filterCheckIns(rows, { ...all, month: "2026-08" }), [rows[0], rows[2]]);
assert.deepEqual(filterCheckIns(rows, { search: "maryama", status: "submitted", month: "2026-08" }), [rows[0]]);
assert.deepEqual(filterCheckIns(rows, { search: "maryama", status: "reviewed", month: "2026-08" }), []);
assert.deepEqual(filterCheckIns([], all), []);
assert.equal(rows.length, 3);
console.log("Check-in filters passed.");
