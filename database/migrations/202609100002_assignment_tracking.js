/** @param {import("knex").Knex} knex */
exports.up = async function up(knex) {
  await knex.schema.alterTable("invoices", (table) => { table.dateTime("client_viewed_at"); });
};

/** @param {import("knex").Knex} knex */
exports.down = async function down(knex) {
  await knex.schema.alterTable("invoices", (table) => { table.dropColumn("client_viewed_at"); });
};
