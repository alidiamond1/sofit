import "server-only";

import knex, { type Knex } from "knex";

declare global {
  var sofitDb: Knex | undefined;
}

function createDatabase() {
  return knex({
    client: "mysql2",
    connection: {
      host: process.env.DB_HOST || "127.0.0.1",
      port: Number(process.env.DB_PORT || 3306),
      database: process.env.DB_NAME || "sofit",
      user: process.env.DB_USER || "root",
      password: process.env.DB_PASSWORD || "",
    },
    pool: { min: 0, max: 10 },
  });
}

export function database() {
  if (!global.sofitDb) global.sofitDb = createDatabase();
  return global.sofitDb;
}

export type UserRole = "coach" | "client";
