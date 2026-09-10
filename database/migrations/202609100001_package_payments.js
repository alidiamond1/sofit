/** @param {import("knex").Knex} knex */
exports.up = async function up(knex) {
  await knex.schema.alterTable("invoices", (t) => {
    t.bigInteger("package_id").unsigned().references("id").inTable("packages").onDelete("RESTRICT");
    t.json("package_snapshot");
    t.dateTime("access_until");
    t.string("provider_sid", 190).unique();
  });
  await knex.schema.alterTable("clients", (t) => {
    t.bigInteger("current_invoice_id").unsigned().references("id").inTable("invoices").onDelete("SET NULL");
  });
  for (const table of ["diet_plans", "workout_plans"]) {
    await knex.schema.alterTable(table, (t) => {
      t.bigInteger("invoice_id").unsigned().references("id").inTable("invoices").onDelete("SET NULL");
    });
  }
  await knex.schema.createTable("payment_attempts", (t) => {
    t.string("id", 36).primary();
    t.bigInteger("invoice_id").unsigned().notNullable().references("id").inTable("invoices").onDelete("CASCADE");
    t.enu("status", ["creating", "ready", "unknown", "failed", "paid"]).notNullable();
    t.text("checkout_url");
    t.dateTime("checked_at");
    t.timestamps(true, true);
    t.index(["invoice_id", "created_at"]);
  });
};

/** @param {import("knex").Knex} knex */
exports.down = async function down(knex) {
  await knex.schema.dropTable("payment_attempts");
  for (const table of ["diet_plans", "workout_plans"]) {
    await knex.schema.alterTable(table, (t) => { t.dropForeign("invoice_id"); t.dropColumn("invoice_id"); });
  }
  await knex.schema.alterTable("clients", (t) => { t.dropForeign("current_invoice_id"); t.dropColumn("current_invoice_id"); });
  await knex.schema.alterTable("invoices", (t) => {
    t.dropForeign("package_id"); t.dropUnique("provider_sid");
    t.dropColumns("package_id", "package_snapshot", "access_until", "provider_sid");
  });
};
