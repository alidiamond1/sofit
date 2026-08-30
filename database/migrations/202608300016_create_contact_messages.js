/** @param {import("knex").Knex} knex */
exports.up = async function up(knex) {
  await knex.schema.createTable("contact_messages", (table) => {
    table.bigIncrements("id").primary();
    table.string("name", 120).notNullable();
    table.string("email", 190).notNullable();
    table.string("phone", 40);
    table.string("subject", 160);
    table.text("message").notNullable();
    table.timestamps(true, true);
    table.index(["created_at"]);
  });
};

/** @param {import("knex").Knex} knex */
exports.down = async function down(knex) {
  await knex.schema.dropTableIfExists("contact_messages");
};
