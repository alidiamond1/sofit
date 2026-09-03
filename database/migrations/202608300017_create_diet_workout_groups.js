/** @param {import("knex").Knex} knex */
exports.up = async function up(knex) {
  await knex.schema.createTable("diet_groups", (t) => {
    t.bigIncrements("id").primary();
    t.string("name", 160).notNullable();
    t.text("description");
    t.json("days");
    t.boolean("is_active").notNullable().defaultTo(true);
    t.timestamps(true, true);
  });

  await knex.schema.createTable("workout_groups", (t) => {
    t.bigIncrements("id").primary();
    t.string("name", 160).notNullable();
    t.text("description");
    t.json("days");
    t.boolean("is_active").notNullable().defaultTo(true);
    t.timestamps(true, true);
  });

  await knex.schema.alterTable("packages", (t) => {
    t.bigInteger("diet_group_id").unsigned().references("id").inTable("diet_groups").onDelete("SET NULL");
    t.bigInteger("workout_group_id").unsigned().references("id").inTable("workout_groups").onDelete("SET NULL");
  });

  // One-time additive backfill: copy each existing tier_packages row's content into a
  // standalone diet_groups row and a standalone workout_groups row. Purely additive —
  // tier_packages itself is never modified, dropped, or read from again after this.
  const tierPackages = await knex("tier_packages").select("id", "title", "days");
  for (const row of tierPackages) {
    const days = typeof row.days === "string" ? JSON.parse(row.days) : row.days || [];
    const dietDays = days.map((day) => ({
      dayIndex: day.dayIndex,
      dayLabel: day.dayLabel,
      meals: day.meals || [],
    }));
    const workoutDays = days.map((day) => ({
      dayIndex: day.dayIndex,
      dayLabel: day.dayLabel,
      exercises: day.exercises || [],
    }));

    await knex("diet_groups").insert({
      name: `${row.title} — Diet`,
      description: null,
      days: JSON.stringify(dietDays),
      is_active: true,
    });
    await knex("workout_groups").insert({
      name: `${row.title} — Workout`,
      description: null,
      days: JSON.stringify(workoutDays),
      is_active: true,
    });
  }
};

/** @param {import("knex").Knex} knex */
exports.down = async function down(knex) {
  await knex.schema.alterTable("packages", (t) => {
    t.dropForeign("diet_group_id");
    t.dropForeign("workout_group_id");
    t.dropColumn("diet_group_id");
    t.dropColumn("workout_group_id");
  });
  await knex.schema.dropTableIfExists("workout_groups");
  await knex.schema.dropTableIfExists("diet_groups");
};
