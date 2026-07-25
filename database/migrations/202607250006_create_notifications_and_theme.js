/** @param {import("knex").Knex} knex */
exports.up = async function up(knex) {
  await knex.schema.alterTable("user_settings", (table) => {
    table.string("theme", 20).notNullable().defaultTo("system");
  });

  await knex.schema.createTable("notifications", (table) => {
    table.bigIncrements("id").primary();
    table.bigInteger("user_id").unsigned().notNullable().references("id").inTable("users").onDelete("CASCADE");
    table.bigInteger("sender_id").unsigned().references("id").inTable("users").onDelete("SET NULL");
    table.string("title", 120).notNullable();
    table.text("message").notNullable();
    table.string("type", 40).notNullable().defaultTo("coaching");
    table.dateTime("read_at");
    table.timestamps(true, true);
    table.index(["user_id", "read_at", "created_at"]);
  });
};

/** @param {import("knex").Knex} knex */
exports.down = async function down(knex) {
  await knex.schema.dropTableIfExists("notifications");
  await knex.schema.alterTable("user_settings", (table) => {
    table.dropColumn("theme");
  });
};
