/** @param {import("knex").Knex} knex */
exports.up = async function up(knex) {
  await knex.schema.createTable("user_avatars", (table) => {
    table.bigInteger("user_id").unsigned().primary().references("id").inTable("users").onDelete("CASCADE");
    table.string("mime_type", 100).notNullable();
    table.specificType("image_data", "LONGBLOB").notNullable();
    table.bigInteger("size_bytes").unsigned().notNullable();
    table.timestamps(true, true);
  });
};

/** @param {import("knex").Knex} knex */
exports.down = async function down(knex) {
  await knex.schema.dropTableIfExists("user_avatars");
};
