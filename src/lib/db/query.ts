import type { QueryResult, QueryResultRow } from "pg";
import { pool } from "./pool";

export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[],
): Promise<QueryResult<T>> {
  return pool.query<T>(text, params);
}
