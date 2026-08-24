/** @param {import("knex").Knex} knex */
exports.up = async function up(knex) {
  await knex.schema.createTable("diet_packages", (t) => {
    t.bigIncrements("id").primary();
    t.enu("tier", ["beginner", "silver", "gold"]).notNullable().unique();
    t.string("title", 160).notNullable();
    t.text("description");
    t.integer("daily_calories");
    t.integer("protein_g");
    t.integer("carbs_g");
    t.integer("fat_g");
    t.json("days");
    t.boolean("is_active").notNullable().defaultTo(true);
    t.timestamps(true, true);
  });

  await knex.schema.createTable("workout_packages", (t) => {
    t.bigIncrements("id").primary();
    t.enu("tier", ["beginner", "silver", "gold"]).notNullable().unique();
    t.string("title", 160).notNullable();
    t.text("description");
    t.integer("weeks").notNullable().defaultTo(4);
    t.json("weekly_split");
    t.json("exercises");
    t.boolean("is_active").notNullable().defaultTo(true);
    t.timestamps(true, true);
  });

  await knex.schema.alterTable("diet_plans", (t) => {
    t.json("days");
  });

  await knex.schema.dropTableIfExists("package_workout_templates");
  await knex.schema.dropTableIfExists("package_diet_templates");
};

/** @param {import("knex").Knex} knex */
exports.down = async function down(knex) {
  await knex.schema.alterTable("diet_plans", (t) => {
    t.dropColumn("days");
  });
  await knex.schema.dropTableIfExists("workout_packages");
  await knex.schema.dropTableIfExists("diet_packages");
};
