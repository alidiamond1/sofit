import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createTranslator } from "next-intl";
import { transformationSchema, parseTransformationStory } from "../src/lib/transformation.ts";

const draft = { displayName: "Amina", beforePhotoUrl: "", afterPhotoUrl: "", description: "", isPublished: false, story: {} };
assert.equal(transformationSchema.safeParse(draft).success, true);
assert.equal(transformationSchema.safeParse({ ...draft, displayName: " " }).success, false);
assert.equal(transformationSchema.safeParse({ ...draft, beforePhotoUrl: "javascript:alert(1)" }).success, false);
assert.equal(transformationSchema.safeParse({ ...draft, isPublished: true }).success, false);
const complete = { ...draft, beforePhotoUrl: "https://example.com/before.jpg", afterPhotoUrl: "https://example.com/after.jpg", isPublished: true, story: { consent: true, durationWeeks: "16", bodyFatBefore: "0", weightBefore: "90", weightAfter: "81" } };
assert.equal(transformationSchema.safeParse(complete).success, true);
assert.equal(transformationSchema.safeParse({ ...complete, story: { consent: false } }).success, false);
assert.equal(transformationSchema.safeParse({ ...complete, story: { consent: true, bodyFatBefore: 101 } }).success, false);
assert.equal(transformationSchema.safeParse({ ...complete, story: { consent: true, durationWeeks: 1.5 } }).success, false);
assert.equal(parseTransformationStory(null).weightBefore, null);
assert.equal(parseTransformationStory("invalid json").headline, "");
assert.equal(parseTransformationStory(JSON.stringify(complete.story)).bodyFatBefore, 0);

const en = JSON.parse(readFileSync(new URL("../messages/en.json", import.meta.url), "utf8"));
const so = JSON.parse(readFileSync(new URL("../messages/so.json", import.meta.url), "utf8"));
for (const namespace of Object.keys(en.Transformations)) {
  assert.deepEqual(Object.keys(en.Transformations[namespace]).sort(), Object.keys(so.Transformations[namespace]).sort());
  for (const [locale, messages] of [["en", en], ["so", so]]) {
    const t = createTranslator({ locale, messages, namespace: `Transformations.${namespace}`, onError: (error) => { throw error; } });
    for (const key of Object.keys(messages.Transformations[namespace])) assert.ok(t(key, { name: "Amina", count: 2 }));
  }
}
console.log("Transformation validation and English/Somali translations passed.");
