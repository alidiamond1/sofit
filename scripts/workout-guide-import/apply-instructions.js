/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * One-off backfill: writes hand-authored "how to perform" coaching cues into
 * exercise_library.instructions for the 291 rows imported by import.js (the
 * workout-guide dataset came with illustrations but no instructional text).
 *
 * Reads scripts/workout-guide-import/instructions.json, a { "<id>": "<text>" }
 * map, and runs one UPDATE per row.
 *
 * Idempotent / safe to re-run: every UPDATE is guarded with
 * `AND instructions IS NULL`, so it never overwrites a coach's own edits or
 * a row that's already been backfilled.
 *
 * Uses the same knex connection config as knexfile.cjs (mysql2, same env
 * vars) so it talks to whatever database the app itself is configured for.
 *
 * Usage: node scripts/workout-guide-import/apply-instructions.js
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
  const dataPath = path.join(__dirname, "instructions.json");
  const instructions = JSON.parse(fs.readFileSync(dataPath, "utf8"));
  const entries = Object.entries(instructions);
  console.log(`Loaded ${entries.length} instructions from ${dataPath}`);

  let updated = 0;
  let skipped = 0;

  for (const [id, text] of entries) {
    const count = await knex("exercise_library")
      .where({ id: Number(id) })
      .whereNull("instructions")
      .update({ instructions: text });

    if (count > 0) {
      updated += 1;
    } else {
      skipped += 1;
    }
  }

  console.log(`${updated} rows updated, ${skipped} skipped (already had instructions or missing).`);
}

main()
  .catch((error) => {
    console.error("Backfill failed:", error);
    process.exitCode = 1;
  })
  .finally(() => {
    knex.destroy();
  });
