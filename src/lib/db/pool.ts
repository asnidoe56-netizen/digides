import { Pool } from "pg";

declare global {
  // eslint-disable-next-line no-var
  var __pgPool: Pool | undefined;
}

function createPool(): Pool {
  // If DATABASE_URL is unset, pg falls back to PG* env vars / local defaults
  // and simply fails at connection time — callers (e.g. /api/health) handle
  // that failure instead of the app crashing at import time.
  return new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 10,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
  });
}

// Reused across hot-reloads in development so we don't exhaust
// PostgreSQL connections every time a module is re-evaluated.
export const pool: Pool = global.__pgPool ?? createPool();

if (process.env.NODE_ENV !== "production") {
  global.__pgPool = pool;
}
