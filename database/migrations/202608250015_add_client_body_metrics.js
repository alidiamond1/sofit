/** @param {import("knex").Knex} knex */
exports.up = async function up(knex) {
  await knex.schema.alterTable("clients", (table) => {
    table.decimal("height_cm", 5, 1);
    table.decimal("starting_weight_kg", 6, 2);
  });
};

/** @param {import("knex").Knex} knex */
exports.down = async function down(knex) {
  await knex.schema.alterTable("clients", (table) => {
    table.dropColumns("height_cm", "starting_weight_kg");
  });
};
