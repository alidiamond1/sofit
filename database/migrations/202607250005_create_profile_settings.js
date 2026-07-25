/** @param {import("knex").Knex} knex */
exports.up = async function up(knex) {
  await knex.schema.alterTable("users", (table) => {
    table.string("phone", 40);
    table.date("date_of_birth");
    table.string("location", 160);
    table.text("bio");
  });

  await knex.schema.createTable("user_settings", (table) => {
    table.bigIncrements("id").primary();
    table.bigInteger("user_id").unsigned().notNullable().unique().references("id").inTable("users").onDelete("CASCADE");
    table.string("timezone", 80).notNullable().defaultTo("Africa/Nairobi");
    table.string("language", 10).notNullable().defaultTo("en");
    table.boolean("email_notifications").notNullable().defaultTo(true);
    table.boolean("in_app_notifications").notNullable().defaultTo(true);
    table.boolean("weekly_summary").notNullable().defaultTo(true);
    table.boolean("session_reminders").notNullable().defaultTo(true);
    table.timestamps(true, true);
  });

  await knex.raw(`
    UPDATE users
    INNER JOIN clients ON clients.user_id = users.id
    SET users.phone = clients.phone,
        users.date_of_birth = clients.date_of_birth
    WHERE users.role = 'client'
  `);
};

/** @param {import("knex").Knex} knex */
exports.down = async function down(knex) {
  await knex.schema.dropTableIfExists("user_settings");
  await knex.schema.alterTable("users", (table) => {
    table.dropColumns("phone", "date_of_birth", "location", "bio");
  });
};
