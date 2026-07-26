/** @param {import("knex").Knex} knex */
exports.up = async function up(knex) {
  // Weekly recurring schedule: for each client + weekday, which workout day + diet.
  await knex.schema.createTable("client_week_schedule", (t) => {
    t.bigIncrements("id").primary();
    t.bigInteger("client_id").unsigned().notNullable().references("id").inTable("clients").onDelete("CASCADE");
    t.tinyint("weekday").notNullable(); // 0 = Monday … 6 = Sunday
    t.bigInteger("workout_plan_id").unsigned().references("id").inTable("workout_plans").onDelete("SET NULL");
    t.string("workout_day", 80);
    t.bigInteger("diet_plan_id").unsigned().references("id").inTable("diet_plans").onDelete("SET NULL");
    t.boolean("is_rest").notNullable().defaultTo(false);
    t.timestamps(true, true);
    t.unique(["client_id", "weekday"]);
  });

  // Per-exercise completion for a specific calendar day (feeds the progress ring).
  await knex.schema.createTable("workout_completions", (t) => {
    t.bigIncrements("id").primary();
    t.bigInteger("client_id").unsigned().notNullable().references("id").inTable("clients").onDelete("CASCADE");
    t.date("scheduled_on").notNullable();
    t.string("exercise_key", 190).notNullable();
    t.dateTime("completed_at").notNullable();
    t.timestamps(true, true);
    t.unique(["client_id", "scheduled_on", "exercise_key"]);
    t.index(["client_id", "scheduled_on"]);
  });
};

/** @param {import("knex").Knex} knex */
exports.down = async function down(knex) {
  await knex.schema.dropTableIfExists("workout_completions");
  await knex.schema.dropTableIfExists("client_week_schedule");
};
