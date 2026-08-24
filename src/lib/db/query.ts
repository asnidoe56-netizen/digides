import type { Pool, PoolClient, QueryResult, QueryResultRow } from "pg";
import { pool } from "./pool";

// Repositories accept either the shared pool (standalone query) or a
// PoolClient handed down from withTransaction() (so several repository
// calls can share one BEGIN/COMMIT and the same row locks). Both expose a
// compatible `.query()` method.
export type Queryable = Pool | PoolClient;

export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[],
  db: Queryable = pool,
): Promise<QueryResult<T>> {
  return db.query<T>(text, params);
}
