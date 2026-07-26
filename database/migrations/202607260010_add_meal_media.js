/** @param {import("knex").Knex} knex */
exports.up = async function up(knex) {
  await knex.schema.alterTable("meal_library", (table) => {
    table.string("media_url", 1000);
  });
};

/** @param {import("knex").Knex} knex */
exports.down = async function down(knex) {
  await knex.schema.alterTable("meal_library", (table) => {
    table.dropColumn("media_url");
  });
};
