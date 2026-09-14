/** @param {import("knex").Knex} knex */
exports.up = async function up(knex) {
  await knex.schema.createTable("walking_targets", (t) => {
    t.bigIncrements("id").primary();
    t.bigInteger("client_id").unsigned().notNullable().references("id").inTable("clients").onDelete("CASCADE");
    t.enu("unit", ["steps", "km"]).notNullable();
    t.decimal("amount", 10, 2).notNullable();
    t.date("starts_on").notNullable();
    t.boolean("active").notNullable().defaultTo(true);
    t.string("notes", 1000).notNullable().defaultTo("");
    t.timestamps(true, true);
    t.unique(["client_id", "starts_on"]);
  });
  await knex.schema.createTable("walking_logs", (t) => {
    t.bigIncrements("id").primary();
    t.bigInteger("client_id").unsigned().notNullable().references("id").inTable("clients").onDelete("CASCADE");
    t.bigInteger("target_id").unsigned().notNullable().references("id").inTable("walking_targets").onDelete("CASCADE");
    t.date("logged_on").notNullable();
    t.decimal("amount", 10, 2).notNullable();
    t.string("notes", 500).notNullable().defaultTo("");
    t.timestamps(true, true);
    t.unique(["client_id", "logged_on"]);
  });
};

/** @param {import("knex").Knex} knex */
exports.down = async function down(knex) {
  await knex.schema.dropTableIfExists("walking_logs");
  await knex.schema.dropTableIfExists("walking_targets");
};
