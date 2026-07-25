/** @param {import("knex").Knex} knex */
exports.up = async function up(knex) {
  await knex.schema.alterTable("messages", (table) => {
    table.index(["recipient_id", "read_at", "created_at"], "messages_inbox_unread_index");
  });
};

/** @param {import("knex").Knex} knex */
exports.down = async function down(knex) {
  await knex.schema.alterTable("messages", (table) => {
    table.dropIndex(["recipient_id", "read_at", "created_at"], "messages_inbox_unread_index");
  });
};
