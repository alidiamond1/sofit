/** @param {import("knex").Knex} knex */
exports.up = (knex) => knex.schema.alterTable("transformations", (table) => {
  table.json("story_details").nullable();
});

/** @param {import("knex").Knex} knex */
exports.down = (knex) => knex.schema.alterTable("transformations", (table) => {
  table.dropColumn("story_details");
});
