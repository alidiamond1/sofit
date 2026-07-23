/** @param {import("knex").Knex} knex */
exports.up = async function up(knex) {
  await knex.schema.createTable("users", (t) => {
    t.bigIncrements("id").primary();
    t.string("name", 120).notNullable();
    t.string("email", 190).notNullable().unique();
    t.string("password_hash", 255).notNullable();
    t.enu("role", ["coach", "client"]).notNullable().defaultTo("client");
    t.string("avatar_path", 500);
    t.boolean("is_active").notNullable().defaultTo(true);
    t.timestamps(true, true);
  });
  await knex.schema.createTable("services", (t) => {
    t.bigIncrements("id").primary();
    t.string("name", 100).notNullable();
    t.enu("type", ["consultation", "diet", "workout", "personal_training"]).notNullable();
    t.enu("tier", ["elite", "business", "athlete"]);
    t.decimal("price", 10, 2).notNullable();
    t.string("billing_interval", 30).defaultTo("one_time");
    t.text("description");
    t.boolean("is_active").notNullable().defaultTo(true);
    t.timestamps(true, true);
  });
  await knex.schema.createTable("clients", (t) => {
    t.bigIncrements("id").primary();
    t.bigInteger("user_id").unsigned().notNullable().unique().references("id").inTable("users").onDelete("CASCADE");
    t.bigInteger("service_id").unsigned().references("id").inTable("services").onDelete("SET NULL");
    t.enu("status", ["active", "paused", "churned"]).notNullable().defaultTo("active");
    t.enu("pipeline_stage", ["lead", "onboarding", "active", "renewal"]).notNullable().defaultTo("lead");
    t.string("phone", 40); t.date("date_of_birth"); t.text("goals"); t.text("medical_notes"); t.date("joined_at");
    t.timestamps(true, true);
  });
  await knex.schema.createTable("invites", (t) => {
    t.bigIncrements("id").primary();
    t.string("email", 190).notNullable(); t.string("token_hash", 255).notNullable().unique();
    t.enu("status", ["sent", "opened", "submitted", "approved", "expired"]).notNullable().defaultTo("sent");
    t.json("intake_answers"); t.dateTime("expires_at").notNullable(); t.timestamps(true, true);
  });
  await knex.schema.createTable("consultations", (t) => {
    t.bigIncrements("id").primary();
    t.bigInteger("client_id").unsigned().notNullable().references("id").inTable("clients").onDelete("CASCADE");
    t.dateTime("starts_at").notNullable(); t.integer("duration_minutes").defaultTo(60);
    t.enu("status", ["scheduled", "completed", "cancelled", "no_show"]).notNullable().defaultTo("scheduled");
    t.json("intake_answers"); t.text("session_notes");
    t.bigInteger("converted_service_id").unsigned().references("id").inTable("services").onDelete("SET NULL");
    t.timestamps(true, true);
  });
  await knex.schema.createTable("diet_plans", (t) => {
    t.bigIncrements("id").primary();
    t.bigInteger("client_id").unsigned().notNullable().references("id").inTable("clients").onDelete("CASCADE");
    t.string("title", 160).notNullable(); t.integer("version").defaultTo(1); t.integer("daily_calories");
    t.integer("protein_g"); t.integer("carbs_g"); t.integer("fat_g"); t.json("meals"); t.json("food_swaps");
    t.enu("status", ["draft", "active", "archived"]).notNullable().defaultTo("draft"); t.date("starts_on"); t.timestamps(true, true);
  });
  await knex.schema.createTable("workout_plans", (t) => {
    t.bigIncrements("id").primary();
    t.bigInteger("client_id").unsigned().notNullable().references("id").inTable("clients").onDelete("CASCADE");
    t.string("title", 160).notNullable(); t.integer("version").defaultTo(1); t.integer("weeks").defaultTo(4);
    t.json("weekly_split"); t.json("exercises"); t.enu("status", ["draft", "active", "archived"]).notNullable().defaultTo("draft");
    t.date("starts_on"); t.timestamps(true, true);
  });
  await knex.schema.createTable("sessions", (t) => {
    t.bigIncrements("id").primary();
    t.bigInteger("client_id").unsigned().notNullable().references("id").inTable("clients").onDelete("CASCADE");
    t.bigInteger("service_id").unsigned().references("id").inTable("services").onDelete("SET NULL");
    t.dateTime("starts_at").notNullable(); t.integer("duration_minutes").defaultTo(60);
    t.enu("attendance", ["scheduled", "attended", "cancelled", "no_show"]).notNullable().defaultTo("scheduled");
    t.text("notes"); t.json("progression_metrics"); t.json("performance_tests"); t.timestamps(true, true);
  });
  await knex.schema.createTable("check_ins", (t) => {
    t.bigIncrements("id").primary();
    t.bigInteger("client_id").unsigned().notNullable().references("id").inTable("clients").onDelete("CASCADE");
    t.date("week_of").notNullable(); t.decimal("weight_kg", 6, 2); t.integer("diet_adherence_pct");
    t.integer("workout_completion_pct"); t.integer("energy_score"); t.integer("sleep_score");
    t.text("client_notes"); t.text("coach_feedback");
    t.enu("status", ["pending", "submitted", "reviewed"]).notNullable().defaultTo("pending");
    t.timestamps(true, true); t.unique(["client_id", "week_of"]);
  });
  await knex.schema.createTable("files", (t) => {
    t.bigIncrements("id").primary();
    t.bigInteger("user_id").unsigned().notNullable().references("id").inTable("users").onDelete("CASCADE");
    t.bigInteger("check_in_id").unsigned().references("id").inTable("check_ins").onDelete("CASCADE");
    t.enu("kind", ["progress_photo", "plan_pdf", "intake_file", "other"]).notNullable();
    t.string("local_path", 500).notNullable(); t.string("original_name", 255).notNullable();
    t.string("mime_type", 100).notNullable(); t.bigInteger("size_bytes").unsigned().notNullable(); t.timestamps(true, true);
  });
  await knex.schema.createTable("invoices", (t) => {
    t.bigIncrements("id").primary();
    t.bigInteger("client_id").unsigned().notNullable().references("id").inTable("clients").onDelete("CASCADE");
    t.bigInteger("service_id").unsigned().references("id").inTable("services").onDelete("SET NULL");
    t.string("number", 50).notNullable().unique(); t.decimal("amount", 10, 2).notNullable(); t.string("currency", 3).defaultTo("USD");
    t.enu("status", ["draft", "unpaid", "paid", "overdue", "void"]).notNullable().defaultTo("unpaid");
    t.date("due_on").notNullable(); t.dateTime("paid_at"); t.timestamps(true, true);
  });
  await knex.schema.createTable("messages", (t) => {
    t.bigIncrements("id").primary();
    t.bigInteger("sender_id").unsigned().notNullable().references("id").inTable("users").onDelete("CASCADE");
    t.bigInteger("recipient_id").unsigned().notNullable().references("id").inTable("users").onDelete("CASCADE");
    t.text("body").notNullable(); t.dateTime("read_at"); t.timestamps(true, true); t.index(["sender_id", "recipient_id", "created_at"]);
  });
};

/** @param {import("knex").Knex} knex */
exports.down = async function down(knex) {
  for (const table of ["messages","invoices","files","check_ins","sessions","workout_plans","diet_plans","consultations","invites","clients","services","users"]) {
    await knex.schema.dropTableIfExists(table);
  }
};

