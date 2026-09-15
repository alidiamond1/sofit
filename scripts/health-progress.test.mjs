import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { NextIntlClientProvider } from "next-intl";
import * as metrics from "../src/lib/body-metrics.ts";

const require = createRequire(import.meta.url);
const messages = JSON.parse(readFileSync(new URL("../messages/en.json", import.meta.url), "utf8"));
const somali = JSON.parse(readFileSync(new URL("../messages/so.json", import.meta.url), "utf8"));
assert.deepEqual(Object.keys(messages.HealthProgress).sort(), Object.keys(somali.HealthProgress).sort());
function load(file, dependencies = {}) {
  const exports = {};
  const code = ts.transpileModule(readFileSync(new URL(file, import.meta.url), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText;
  runInNewContext(code, { exports, require: (name) => dependencies[name] ?? require(name), Date });
  return exports;
}
const dialog = load("../src/components/dashboard/form-dialog.tsx");
const { BodyMetricsEditor } = load("../src/components/profile/body-metrics-form.tsx", {
  "@/components/dashboard/form-dialog": dialog, "@/lib/body-metrics": metrics,
  "@/app/actions/profile": { updateBodyMetricsAction: async () => ({ success: "Saved" }) },
});
function render(values) {
  return renderToStaticMarkup(React.createElement(NextIntlClientProvider, { locale: "en", timeZone: "UTC", messages },
    React.createElement(BodyMetricsEditor, { nudge: true, goals: "", medicalNotes: "", ...values })));
}
assert.match(render({ height: "", startingWeight: "", dateOfBirth: "" }), /<dialog/);
assert.match(render({ height: "175", startingWeight: "80", dateOfBirth: "" }), /<dialog/);
const complete = render({ height: "175", startingWeight: "80", dateOfBirth: "2000-01-01" });
assert.doesNotMatch(complete, /<dialog/);
assert.match(complete, /Health profile complete/);
assert.match(render({ height: "99", startingWeight: "80", dateOfBirth: "2000-01-01" }), /<dialog/);
assert.equal(metrics.calculateBmi(175, null), null);
assert.equal(metrics.calculateBmi(null, 68), null);
assert.equal(metrics.calculateBmi(200, 80), 20);
assert.equal(metrics.adultBmiEligible("2010-01-01", "2026-09-15"), false);
console.log("Health profile completion, initial popup, BMI guards, and EN/SO chart labels passed.");
