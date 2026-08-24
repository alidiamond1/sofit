/** @param {import("knex").Knex} knex */
exports.up = async function up(knex) {
  await knex.schema.createTable("package_diet_templates", (t) => {
    t.bigIncrements("id").primary();
    t.bigInteger("package_id").unsigned().notNullable().unique().references("id").inTable("packages").onDelete("CASCADE");
    t.string("title", 160).notNullable();
    t.integer("daily_calories").notNullable();
    t.integer("protein_g");
    t.integer("carbs_g");
    t.integer("fat_g");
    t.json("meals").notNullable();
    t.timestamps(true, true);
  });

  await knex.schema.createTable("package_workout_templates", (t) => {
    t.bigIncrements("id").primary();
    t.bigInteger("package_id").unsigned().notNullable().unique().references("id").inTable("packages").onDelete("CASCADE");
    t.string("title", 160).notNullable();
    t.integer("weeks").notNullable().defaultTo(4);
    t.json("weekly_split").notNullable();
    t.json("exercises").notNullable();
    t.timestamps(true, true);
  });
};

/** @param {import("knex").Knex} knex */
exports.down = async function down(knex) {
  await knex.schema.dropTableIfExists("package_workout_templates");
  await knex.schema.dropTableIfExists("package_diet_templates");
};
