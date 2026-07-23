/** @param {import("knex").Knex} knex */
exports.up = async function up(knex) {
  await knex.schema.createTable("packages", (t) => {
    t.bigIncrements("id").primary();
    t.string("name", 120).notNullable();
    t.enu("category", ["beginner", "intermediate", "elite", "business", "athlete"]).notNullable();
    t.text("description");
    t.decimal("price", 10, 2).notNullable().defaultTo(0);
    t.string("billing_interval", 30).notNullable().defaultTo("monthly");
    t.boolean("is_active").notNullable().defaultTo(true);
    t.timestamps(true, true);
  });

  await knex.schema.createTable("package_services", (t) => {
    t.bigIncrements("id").primary();
    t.bigInteger("package_id").unsigned().notNullable().references("id").inTable("packages").onDelete("CASCADE");
    t.bigInteger("service_id").unsigned().notNullable().references("id").inTable("services").onDelete("CASCADE");
    t.integer("quantity").unsigned().notNullable().defaultTo(1);
    t.string("notes", 255);
    t.timestamps(true, true);
    t.unique(["package_id", "service_id"]);
  });

  await knex.schema.alterTable("clients", (t) => {
    t.bigInteger("package_id").unsigned().references("id").inTable("packages").onDelete("SET NULL");
  });
};

/** @param {import("knex").Knex} knex */
exports.down = async function down(knex) {
  await knex.schema.alterTable("clients", (t) => {
    t.dropForeign("package_id");
    t.dropColumn("package_id");
  });
  await knex.schema.dropTableIfExists("package_services");
  await knex.schema.dropTableIfExists("packages");
};
