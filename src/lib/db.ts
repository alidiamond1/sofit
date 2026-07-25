import "server-only";

import knex, { type Knex } from "knex";

declare global {
  var sofitDb: Knex | undefined;
}

function createDatabase() {
  const databaseUrl = process.env.DATABASE_URL?.trim();
  const sslEnabled = ["1", "true", "required"].includes((process.env.DB_SSL || "").toLowerCase());
  const poolMax = Math.max(1, Number(process.env.DB_POOL_MAX || 3));

  if (process.env.NODE_ENV === "production" && !databaseUrl && !process.env.DB_HOST) {
    throw new Error("Configure DATABASE_URL or the DB_HOST/DB_NAME/DB_USER/DB_PASSWORD variables.");
  }

  return knex({
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
    acquireConnectionTimeout: 10_000,
  });
}

export function database() {
  if (!global.sofitDb) global.sofitDb = createDatabase();
  return global.sofitDb;
}

export type UserRole = "coach" | "client";
