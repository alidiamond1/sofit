/* eslint-disable @typescript-eslint/no-require-imports */
const { loadEnvConfig } = require("@next/env");

loadEnvConfig(process.cwd());

const databaseUrl = process.env.DATABASE_URL && process.env.DATABASE_URL.trim();
const sslEnabled = ["1", "true", "required"].includes((process.env.DB_SSL || "").toLowerCase());
const poolMax = Math.max(1, Number(process.env.DB_POOL_MAX || 3));

const config = {
  client: "mysql2",
  connection: databaseUrl || {
    host: process.env.DB_HOST || "127.0.0.1",
    port: Number(process.env.DB_PORT || 3306),
    database: process.env.DB_NAME || "sofit",
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    ...(sslEnabled ? { ssl: { rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== "false" } } : {}),
  },
  migrations: { directory: "./database/migrations" },
  seeds: { directory: "./database/seeds" },
  pool: { min: 0, max: poolMax },
  acquireConnectionTimeout: 10000,
};

module.exports = { development: config, test: config, production: config };
