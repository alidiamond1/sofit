import "server-only";

import knex, { type Knex } from "knex";

declare global {
  var sofitDb: Knex | undefined;
}

/* Two rules keep a remote MySQL usable from serverless functions:

   1. Never let a socket hang. A stalled connect holds the whole invocation
      open, and the platform eventually answers 503/504 long after the visitor
      gave up staring at a spinner. Failing in 8s lets an error boundary render
      something useful instead.
   2. Never reuse a socket the server already closed. Containers are frozen
      between invocations, so a pooled connection can come back dead; keepalive
      probes plus a short idle reap keep the pool honest. */
const CONNECT_TIMEOUT_MS = Math.max(1_000, Number(process.env.DB_CONNECT_TIMEOUT_MS || 8_000));
const POOL_IDLE_MS = 30_000;

function createDatabase() {
  const databaseUrl = process.env.DATABASE_URL?.trim();
  const sslEnabled = ["1", "true", "required"].includes((process.env.DB_SSL || "").toLowerCase());
  const poolMax = Math.max(1, Number(process.env.DB_POOL_MAX || 3));

  if (process.env.NODE_ENV === "production" && !databaseUrl && !process.env.DB_HOST) {
    throw new Error("Configure DATABASE_URL or the DB_HOST/DB_NAME/DB_USER/DB_PASSWORD variables.");
  }

  // Passed straight through to mysql2 for either connection style.
  const driverOptions = {
    connectTimeout: CONNECT_TIMEOUT_MS,
    enableKeepAlive: true,
    keepAliveInitialDelay: 5_000,
  };

  return knex({
    client: "mysql2",
    connection: databaseUrl
      ? { uri: databaseUrl, ...driverOptions }
      : {
          host: process.env.DB_HOST || "127.0.0.1",
          port: Number(process.env.DB_PORT || 3306),
          database: process.env.DB_NAME || "sofit",
          user: process.env.DB_USER || "root",
          password: process.env.DB_PASSWORD || "",
          ...(sslEnabled ? { ssl: { rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== "false" } } : {}),
          ...driverOptions,
        },
    pool: {
      min: 0,
      max: poolMax,
      // Give up rather than queue forever behind a dead connection.
      acquireTimeoutMillis: CONNECT_TIMEOUT_MS,
      createTimeoutMillis: CONNECT_TIMEOUT_MS,
      destroyTimeoutMillis: 5_000,
      createRetryIntervalMillis: 400,
      idleTimeoutMillis: POOL_IDLE_MS,
      reapIntervalMillis: 5_000,
    },
    acquireConnectionTimeout: CONNECT_TIMEOUT_MS + 2_000,
  });
}

export function database() {
  if (!global.sofitDb) global.sofitDb = createDatabase();
  return global.sofitDb;
}

/** Rejects instead of hanging forever, so callers can always render *something*. */
export async function withDbTimeout<T>(work: Promise<T>, ms = CONNECT_TIMEOUT_MS + 4_000): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      work,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error(`Database did not respond within ${ms}ms.`)), ms);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/** Cheap liveness probe used by /api/health. Never throws. */
export async function pingDatabase(): Promise<{ ok: boolean; ms: number; error?: string }> {
  const startedAt = Date.now();
  try {
    await withDbTimeout(database().raw("select 1"));
    return { ok: true, ms: Date.now() - startedAt };
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    return { ok: false, ms: Date.now() - startedAt, error: reason };
  }
}

export type UserRole = "coach" | "client";
