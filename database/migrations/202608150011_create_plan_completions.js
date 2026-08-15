/** @param {import("knex").Knex} knex */
exports.up = async function up(knex) {
  // Per-item, per-day completion log for the client-facing diet/workout plan
  // pages — lets a client mark a meal or exercise done for today and see a
  // history of past days. `details` carries actual sets/reps/weight/notes for
  // workout items; unused (null) for meals.
  await knex.schema.createTable("plan_completions", (t) => {
    t.bigIncrements("id").primary();
    t.bigInteger("client_id").unsigned().notNullable().references("id").inTable("clients").onDelete("CASCADE");
    t.enu("plan_type", ["diet", "workout"]).notNullable();
    t.bigInteger("plan_id").unsigned().notNullable();
    t.string("item_key", 190).notNullable();
    t.date("scheduled_on").notNullable();
    t.json("details");
    t.dateTime("completed_at").notNullable();
    t.timestamps(true, true);
    t.unique(["plan_type", "plan_id", "item_key", "scheduled_on"]);
    t.index(["client_id", "plan_type", "plan_id"]);
  });
};

/** @param {import("knex").Knex} knex */
exports.down = async function down(knex) {
  await knex.schema.dropTableIfExists("plan_completions");
};
