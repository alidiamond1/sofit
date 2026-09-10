/* eslint-disable @typescript-eslint/no-require-imports */
// Uses only newly-created fixture rows. Sifalo requests are mocked; no money moves.
// Run: node scripts/payments.integration.cjs [--keep-ui]
// Create only UI fixtures: node scripts/payments.integration.cjs --ui
// Cleanup a retained UI fixture: node scripts/payments.integration.cjs --cleanup
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const Module = require("node:module");
const { randomUUID } = require("node:crypto");
const ts = require("typescript");
require("@next/env").loadEnvConfig(process.cwd());

const originalLoad = Module._load;
const jar = new Map();
Module._load = function (name, parent, isMain) {
  if (name === "server-only") return {};
  if (name === "next/cache") return { revalidatePath() {} };
  if (name === "next/navigation") return { redirect(url) { throw new Error(`REDIRECT:${url}`); } };
  if (name === "next/headers") return { cookies: async () => ({ get: (key) => jar.get(key), set: (key, value) => jar.set(key, { value }), delete: (key) => jar.delete(key) }) };
  if (name.startsWith("@/")) name = path.resolve("src", name.slice(2));
  return originalLoad.call(this, name, parent, isMain);
};
Module._extensions[".ts"] = (module, filename) => {
  const source = fs.readFileSync(filename, "utf8");
  const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } });
  module._compile(output.outputText, filename);
};

const { database } = require("../src/lib/db.ts");
const auth = require("../src/lib/auth/session.ts");
const { assignPricedPackage, loadBilling } = require("../src/lib/payments/billing.ts");
const { startCheckoutAction, verifyPaymentAction } = require("../src/app/actions/payments.ts");
const db = database();
const fixtureFile = path.join(require("node:os").tmpdir(), "sofit-payment-fixture.json");
let fixture;

async function cleanup(saved) {
  if (!saved) return;
  await db.transaction(async (trx) => {
    await trx("clients").whereIn("user_id", saved.userIds).update({ current_invoice_id: null });
    await trx("users").whereIn("id", saved.userIds).where("email", "like", "payment-test-%@example.invalid").del();
    await trx("packages").whereIn("id", saved.packageIds).where("name", "like", "Payment test %").del();
    await trx("diet_groups").where({ id: saved.groupId }).where("name", "like", "Payment test %").del();
  });
}

async function run() {
  if (process.argv.includes("--cleanup")) {
    if (fs.existsSync(fixtureFile)) { await cleanup(JSON.parse(fs.readFileSync(fixtureFile, "utf8"))); fs.unlinkSync(fixtureFile); }
    console.log("Payment UI fixtures removed.");
    return;
  }
  if (process.argv.includes("--pay-ui")) {
    const saved = JSON.parse(fs.readFileSync(fixtureFile, "utf8"));
    const user = await db("users").where({ id: saved.userIds[0] }).first();
    await auth.createSession({ id: Number(user.id), name: user.name, email: user.email, role: "client", approvalStatus: "approved" });
    const billing = await loadBilling(user.id);
    process.env.SIFALO_API_USERNAME = "test-user";
    process.env.SIFALO_API_PASSWORD = "test-password";
    process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000";
    global.fetch = async (url) => Response.json(String(url).endsWith("verify.php")
      ? { sid: `ui-${randomUUID()}`, amount: String(billing.invoice.amount), status: "success", code: 601 }
      : { key: "fixture", token: "fixture" });
    assert.ok((await startCheckoutAction(Number(billing.invoice.id))).url);
    assert.equal((await verifyPaymentAction(Number(billing.invoice.id))).paid, true);
    console.log("UI fixture paid through simulated provider verification; no real payment made.");
    return;
  }
  const suffix = randomUUID();
  const password = `Test-${randomUUID()}`;
  const bcrypt = require("bcryptjs");
  const passwordHash = await bcrypt.hash(password, 10);
  fixture = { userIds: [], packageIds: [], groupId: null, password };
  await db.transaction(async (trx) => {
    [fixture.groupId] = await trx("diet_groups").insert({ name: `Payment test ${suffix}`, days: JSON.stringify([{ dayIndex: 0, dayLabel: "Monday", meals: [{ name: "PAYMENT_PROTECTED_MEAL", type: "breakfast", calories: 450 }] }]) });
    for (let index = 0; index < 2; index += 1) {
      const [id] = await trx("users").insert({ name: `Payment test ${index}`, email: `payment-test-${suffix}-${index}@example.invalid`, password_hash: passwordHash, role: "client", is_active: true, approval_status: "approved" });
      fixture.userIds.push(Number(id));
      await trx("clients").insert({ user_id: id, status: "active", pipeline_stage: "onboarding" });
      const [pkg] = await trx("packages").insert({ name: `Payment test ${index ? "Strength" : "Complete"}`, description: "Personal coaching, a balanced nutrition plan, and support to build lasting habits.", category: "elite", price: index ? "260.00" : "99.00", billing_interval: "monthly", diet_group_id: fixture.groupId, is_active: true });
      fixture.packageIds.push(Number(pkg));
    }
  });
  const user = await db("users").where({ id: fixture.userIds[0] }).first();
  fixture.email = user.email;
  await auth.createSession({ id: Number(user.id), name: user.name, email: user.email, role: "client", approvalStatus: "pending" });
  assert.equal((await auth.requireRole("client")).approvalStatus, "approved", "Approval must come from DB, not a stale JWT.");
  const clients = await db("clients").whereIn("user_id", fixture.userIds).orderBy("id");
  if (process.argv.includes("--ui")) {
    await db.transaction((trx) => assignPricedPackage(trx, Number(clients[0].id), fixture.packageIds[0]));
    fs.writeFileSync(fixtureFile, JSON.stringify(fixture));
    console.log("Isolated unpaid UI fixture ready.");
    return;
  }
  await db("users").where({ id: user.id }).update({ approval_status: "pending" });
  await assert.rejects(db.transaction((trx) => assignPricedPackage(trx, Number(clients[0].id), fixture.packageIds[0])), /Approve/);
  await assert.rejects(auth.requireRole("client"), /application-pending/);
  await db("users").where({ id: user.id }).update({ approval_status: "approved" });
  const assigned = await Promise.all([0, 1].map(() => db.transaction((trx) => assignPricedPackage(trx, Number(clients[0].id), fixture.packageIds[0]))));
  assert.equal(assigned[0].id, assigned[1].id, "Concurrent assignment must create one invoice.");
  let invoiceId = Number(assigned[0].id);
  const other = await db.transaction((trx) => assignPricedPackage(trx, Number(clients[1].id), fixture.packageIds[0]));
  assert.equal((await loadBilling(user.id)).unlocked, false);
  assert.equal((await db("diet_plans").where({ client_id: clients[0].id })).length, 0, "No plan content before payment.");
  await db("packages").where({ id: fixture.packageIds[0] }).update({ price: "150.00" });
  let response = { sid: `sid-${suffix}`, amount: "99.00", status: "success", code: 601 };
  let calls = [];
  let gatewayTimeout = false;
  process.env.SIFALO_API_USERNAME = "test-user";
  process.env.SIFALO_API_PASSWORD = "test-password";
  process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000";
  global.fetch = async (url, options) => {
    assert.match(String(url), /^https:\/\/api\.sifalopay\.com\/gateway\/(verify.php)?$/);
    const body = JSON.parse(options.body);
    calls.push({ url, body });
    if (String(url).endsWith("verify.php")) return Response.json(response);
    assert.equal(body.amount, "99.00", "Checkout must use snapshot price, not current catalog price.");
    assert.match(body.return_url, /order_id=[a-f0-9-]{36}/);
    if (gatewayTimeout) throw new Error("timeout");
    return Response.json({ key: "test+key=", token: "test/token" });
  };
  assert.ok((await startCheckoutAction(Number(other.id))).error, "IDOR checkout must fail.");
  assert.ok((await verifyPaymentAction(Number(other.id))).error, "IDOR verification must fail.");
  assert.equal(calls.length, 0);
  const attempts = await Promise.all([startCheckoutAction(invoiceId), startCheckoutAction(invoiceId)]);
  assert.equal(calls.length, 1, "Double-click must create only one checkout.");
  assert.ok(attempts.some((item) => item.url?.startsWith("https://pay.sifalo.com/checkout/")));
  assert.ok((await startCheckoutAction(invoiceId)).url);
  assert.equal(calls.length, 1, "Retry must reuse the checkout URL.");
  const attempt = await db("payment_attempts").where({ invoice_id: invoiceId }).first();
  response = { ...response, amount: "0.99" };
  assert.ok((await verifyPaymentAction(invoiceId, attempt.id)).error);
  assert.equal((await loadBilling(user.id)).unlocked, false, "Underpayment must never unlock.");
  assert.deepEqual(calls.at(-1).body, { order_id: attempt.id }, "Verification must bind to the server's order, not a browser sid.");
  await db("payment_attempts").where({ id: attempt.id }).update({ checked_at: null });
  response = { ...response, amount: "99.00" };
  assert.equal((await verifyPaymentAction(invoiceId, attempt.id)).paid, true);
  assert.equal((await loadBilling(user.id)).unlocked, true);
  const planCount = (await db("diet_plans").where({ invoice_id: invoiceId })).length;
  assert.equal(planCount, 1);
  assert.equal((await verifyPaymentAction(invoiceId, attempt.id)).paid, true);
  assert.equal((await db("diet_plans").where({ invoice_id: invoiceId })).length, planCount, "Repeated return must not duplicate plans.");
  await db("clients").where({ id: clients[0].id }).update({ status: "paused" });
  assert.equal((await loadBilling(user.id)).unlocked, false);
  await db("clients").where({ id: clients[0].id }).update({ status: "active" });
  await db("invoices").where({ id: invoiceId }).update({ access_until: new Date(Date.now() - 1000) });
  const renewals = await Promise.all([loadBilling(user.id), loadBilling(user.id)]);
  assert.equal(renewals[0].invoice.id, renewals[1].invoice.id, "Concurrent expiry checks must create one renewal.");
  assert.equal(renewals[0].unlocked, false);
  assert.equal(String(renewals[0].invoice.amount), "99.00");
  invoiceId = Number(renewals[0].invoice.id);
  await startCheckoutAction(invoiceId);
  assert.ok((await verifyPaymentAction(invoiceId)).error, "Reusing another invoice's sid must fail at the unique DB constraint.");
  assert.equal((await loadBilling(user.id)).unlocked, false);
  await db("payment_attempts").where({ invoice_id: invoiceId }).update({ checked_at: null });
  response = { ...response, status: "failure", code: 600 };
  assert.ok((await verifyPaymentAction(invoiceId)).error);
  gatewayTimeout = true;
  assert.ok((await startCheckoutAction(invoiceId)).error);
  const callsBeforeRetry = calls.length;
  assert.ok((await startCheckoutAction(invoiceId)).error);
  assert.equal(calls.length, callsBeforeRetry, "Unknown gateway result must not create a second charge.");
  gatewayTimeout = false;
  response = { ...response, sid: `second-${suffix}`, status: "success", code: 601 };
  const replacement = await db.transaction((trx) => assignPricedPackage(trx, Number(clients[0].id), fixture.packageIds[1]));
  assert.equal((await verifyPaymentAction(invoiceId)).paid, true);
  assert.equal((await loadBilling(user.id)).unlocked, false, "Late success for an old package must not unlock its replacement.");
  assert.equal(Number((await loadBilling(user.id)).invoice.id), Number(replacement.id));
  console.log("Payment integration passed: fresh approval, concurrent assignment/checkout, IDOR, price tampering, underpayment, replay, single activation, expiry, renewal, timeout recovery and replacement isolation.");
  if (process.argv.includes("--keep-ui")) {
    fs.mkdirSync(path.dirname(fixtureFile), { recursive: true });
    fs.writeFileSync(fixtureFile, JSON.stringify(fixture));
    console.log("Retained two isolated UI fixture accounts; run --cleanup when finished.");
  }
}

run().catch((error) => { console.error(error.message); process.exitCode = 1; }).finally(async () => {
  if ((!process.argv.includes("--keep-ui") && !process.argv.includes("--ui")) || process.exitCode) await cleanup(fixture);
  await db.destroy();
});
