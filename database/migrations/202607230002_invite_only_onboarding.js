/** @param {import("knex").Knex} knex */
exports.up = async function up(knex) {
  await knex.schema.alterTable("users", (t) => {
    t.enu("approval_status", ["pending", "approved", "rejected"]).notNullable().defaultTo("approved").after("role");
  });
  await knex.schema.alterTable("invites", (t) => {
    t.bigInteger("user_id").unsigned().references("id").inTable("users").onDelete("SET NULL");
    t.bigInteger("reviewed_by").unsigned().references("id").inTable("users").onDelete("SET NULL");
    t.bigInteger("selected_service_id").unsigned().references("id").inTable("services").onDelete("SET NULL");
    t.dateTime("opened_at"); t.dateTime("submitted_at"); t.dateTime("approved_at"); t.text("review_notes");
  });
};

/** @param {import("knex").Knex} knex */
exports.down = async function down(knex) {
  await knex.schema.alterTable("invites", (t) => {
    t.dropForeign(["selected_service_id"]); t.dropForeign(["reviewed_by"]); t.dropForeign(["user_id"]);
    t.dropColumns("selected_service_id", "reviewed_by", "user_id", "opened_at", "submitted_at", "approved_at", "review_notes");
  });
  await knex.schema.alterTable("users", (t) => t.dropColumn("approval_status"));
};

