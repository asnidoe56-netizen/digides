import type { PoolClient } from "pg";
import { pool } from "./pool";

// Wraps a series of queries in a single PostgreSQL transaction (BEGIN/COMMIT),
// rolling back automatically if the callback throws. Callers pass the given
// client (not the shared pool) so every query in `fn` runs on the same
// connection — required for row locking (e.g. SELECT ... FOR UPDATE) used by
// the wallet and transaction engines.
export async function withTransaction<T>(
  fn: (client: PoolClient) => Promise<T>,
): Promise<T> {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
