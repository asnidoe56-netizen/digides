import type { Queryable } from "@/lib/db/query";
import { pool } from "@/lib/db/pool";

export interface WilayahOption {
  kode: string;
  nama: string;
}

// wilayah.kode is a dot-separated hierarchical code ("11" -> "11.01" ->
// "11.01.01" -> "11.01.01.2001" for provinsi -> kabupaten/kota -> kecamatan
// -> kelurahan/desa) — see migration 039_wilayah_reference.sql. "Direct
// children of X" is everything one segment longer than X: prefixed with
// "X." and containing no further "." after that prefix. Provinces (no
// parent) are the rows with no "." at all.
export async function findWilayahChildren(
  parentKode: string | null,
  db: Queryable = pool,
): Promise<WilayahOption[]> {
  if (parentKode === null) {
    const result = await db.query<WilayahOption>(
      `SELECT kode, nama FROM wilayah WHERE kode !~ '\\.' ORDER BY nama`,
    );
    return result.rows;
  }

  const result = await db.query<WilayahOption>(
    `SELECT kode, nama FROM wilayah
     WHERE kode LIKE $1 AND kode NOT LIKE $2
     ORDER BY nama`,
    [`${parentKode}.%`, `${parentKode}.%.%`],
  );
  return result.rows;
}
