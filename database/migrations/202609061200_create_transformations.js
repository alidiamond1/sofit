/** @param {import("knex").Knex} knex */
exports.up = function up(knex) {
  return knex.schema.createTable("transformations", (t) => {
    t.increments("id").primary();
    // Standalone — not linked to `clients`. A coach may feature someone who isn't
    // an app user, or use a display name instead of their account name for privacy.
    t.string("display_name", 120).notNullable();
    // Nullable: a freshly-created entry starts as a draft (name only) until the
    // coach uploads both photos. A row can only be published once both are set —
    // enforced in the update/toggle actions, not at the schema level.
    t.string("before_photo_url", 500);
    t.string("after_photo_url", 500);
    t.text("description");
    t.boolean("is_published").notNullable().defaultTo(false);
    t.integer("sort_order").notNullable().defaultTo(0);
    t.timestamps(true, true);
  });
};

/** @param {import("knex").Knex} knex */
exports.down = function down(knex) {
  return knex.schema.dropTable("transformations");
};
