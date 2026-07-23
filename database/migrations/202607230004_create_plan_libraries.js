/** @param {import("knex").Knex} knex */
exports.up = async function up(knex) {
  await knex.schema.createTable("meal_library", (t) => {
    t.bigIncrements("id").primary();
    t.string("name", 140).notNullable();
    t.enu("meal_type", ["breakfast", "lunch", "dinner", "snack"]).notNullable();
    t.integer("calories").unsigned();
    t.integer("protein_g").unsigned();
    t.integer("carbs_g").unsigned();
    t.integer("fat_g").unsigned();
    t.text("ingredients").notNullable();
    t.text("instructions");
    t.boolean("is_active").notNullable().defaultTo(true);
    t.timestamps(true, true);
    t.index(["meal_type", "is_active"]);
  });

  await knex.schema.createTable("exercise_library", (t) => {
    t.bigIncrements("id").primary();
    t.string("name", 140).notNullable();
    t.string("muscle_group", 80).notNullable();
    t.string("equipment", 100).notNullable().defaultTo("Bodyweight");
    t.enu("difficulty", ["beginner", "intermediate", "advanced"]).notNullable().defaultTo("beginner");
    t.enu("motion_type", ["squat", "hinge", "push", "pull", "lunge", "plank", "curl", "press", "custom"]).notNullable().defaultTo("custom");
    t.string("media_url", 1000);
    t.text("instructions");
    t.boolean("is_active").notNullable().defaultTo(true);
    t.timestamps(true, true);
    t.index(["muscle_group", "difficulty", "is_active"]);
  });
};

/** @param {import("knex").Knex} knex */
exports.down = async function down(knex) {
  await knex.schema.dropTableIfExists("exercise_library");
  await knex.schema.dropTableIfExists("meal_library");
};
