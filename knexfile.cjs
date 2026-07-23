/* eslint-disable @typescript-eslint/no-require-imports */
const { loadEnvConfig } = require("@next/env");

loadEnvConfig(process.cwd());

const config = {
  client: "mysql2",
  connection: {
    host: process.env.DB_HOST || "127.0.0.1",
    port: Number(process.env.DB_PORT || 3306),
    database: process.env.DB_NAME || "sofit",
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
  },
  migrations: { directory: "./database/migrations" },
  seeds: { directory: "./database/seeds" },
  pool: { min: 0, max: 10 },
};

module.exports = { development: config, test: config, production: config };
