/** @param {import("knex").Knex} knex */
exports.up = async function up(knex) {
  await knex.schema.alterTable("walking_targets", (t) => {
    // Null preserves existing ongoing daily targets; new plans have dated daily totals.
    t.json("daily_targets");
  });
};

/** @param {import("knex").Knex} knex */
exports.down = async function down(knex) {
  await knex.schema.alterTable("walking_targets", (t) => t.dropColumn("daily_targets"));
};
