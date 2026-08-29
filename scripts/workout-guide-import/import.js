/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * One-off import: loads scripts/workout-guide-import/exercises.json (a
 * trimmed copy of https://github.com/bryllim/workout-guide.git's manifest,
 * produced by extract.js) into the `exercise_library` table.
 *
 * Field mapping:
 *   name          <- name
 *   muscle_group  <- primaryMuscle
 *   equipment     <- equipment (verbatim free text)
 *   difficulty    <- "beginner" (source has no difficulty data)
 *   motion_type   <- "custom" (cosmetic-only fallback field, unused once
 *                    media_url is set)
 *   media_url     <- /exercise-library/<slug>/frame-2.svg (mid-movement pose)
 *   instructions  <- null
 *   is_active     <- true
 *
 * Idempotent: skips any row whose name already exists in exercise_library
 * (case-insensitive), so it is safe to re-run.
 *
 * Uses the same knex connection config as knexfile.cjs (mysql2, same env
 * vars) so it talks to whatever database the app itself is configured for.
 *
 * Usage: node scripts/workout-guide-import/import.js
 */
const path = require("path");
const fs = require("fs");
const { loadEnvConfig } = require("@next/env");

loadEnvConfig(process.cwd());

const databaseUrl = process.env.DATABASE_URL && process.env.DATABASE_URL.trim();
const sslEnabled = ["1", "true", "required"].includes((process.env.DB_SSL || "").toLowerCase());
const poolMax = Math.max(1, Number(process.env.DB_POOL_MAX || 3));

const knex = require("knex")({
  client: "mysql2",
  connection: databaseUrl || {
    host: process.env.DB_HOST || "127.0.0.1",
    port: Number(process.env.DB_PORT || 3306),
    database: process.env.DB_NAME || "sofit",
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    ...(sslEnabled ? { ssl: { rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== "false" } } : {}),
  },
  pool: { min: 0, max: poolMax },
  acquireConnectionTimeout: 10000,
});

async function main() {
  const dataPath = path.join(__dirname, "exercises.json");
  const exercises = JSON.parse(fs.readFileSync(dataPath, "utf8"));
  console.log(`Loaded ${exercises.length} exercises from ${dataPath}`);

  const existingRows = await knex("exercise_library").select("name");
  const existingNames = new Set(existingRows.map((row) => String(row.name).toLowerCase()));

  const toInsert = [];
  let skipped = 0;

  for (const exercise of exercises) {
    if (existingNames.has(exercise.name.toLowerCase())) {
      skipped += 1;
      continue;
    }
    // Guard against duplicate names within the import batch itself.
    existingNames.add(exercise.name.toLowerCase());

    toInsert.push({
      name: exercise.name,
      muscle_group: exercise.primaryMuscle,
      equipment: exercise.equipment,
      difficulty: "beginner",
      motion_type: "custom",
      media_url: `/exercise-library/${exercise.slug}/frame-2.svg`,
      instructions: null,
      is_active: true,
    });
  }

  if (toInsert.length > 0) {
    const CHUNK_SIZE = 100;
    for (let i = 0; i < toInsert.length; i += CHUNK_SIZE) {
      await knex("exercise_library").insert(toInsert.slice(i, i + CHUNK_SIZE));
    }
  }

  console.log(`${toInsert.length} inserted, ${skipped} skipped as duplicates.`);
}

main()
  .catch((error) => {
    console.error("Import failed:", error);
    process.exitCode = 1;
  })
  .finally(() => {
    knex.destroy();
  });
