/** @param {import("knex").Knex} knex */
exports.up = async function up(knex) {
  await knex.schema.alterTable("check_ins", (t) => {
    // { front: string|null, side: string|null, back: string|null } — each value an
    // ImageKit CDN URL (or null if that angle wasn't uploaded). Nullable/additive only:
    // pre-existing check-in rows simply have progress_photos = NULL.
    t.json("progress_photos");
  });
};

/** @param {import("knex").Knex} knex */
exports.down = async function down(knex) {
  await knex.schema.alterTable("check_ins", (t) => {
    t.dropColumn("progress_photos");
  });
};
