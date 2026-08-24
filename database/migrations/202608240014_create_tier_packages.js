/** @param {import("knex").Knex} knex */
exports.up = async function up(knex) {
  await knex.schema.createTable("tier_packages", (t) => {
    t.bigIncrements("id").primary();
    t.enu("tier", ["beginner", "silver", "gold"]).notNullable().unique();
    t.string("title", 160).notNullable();
    t.text("description");
    t.json("days");
    t.boolean("is_active").notNullable().defaultTo(true);
    t.timestamps(true, true);
  });

  await knex.schema.dropTableIfExists("workout_packages");
  await knex.schema.dropTableIfExists("diet_packages");
};

/** @param {import("knex").Knex} knex */
exports.down = async function down(knex) {
  await knex.schema.dropTableIfExists("tier_packages");
};
