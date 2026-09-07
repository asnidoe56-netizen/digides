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

// Resolves a user's stored province_code/regency_code/district_code/
// village_code (see 040_users_address_location.sql) into display names —
// the Super Admin "Detail Pengguna" page's "Alamat" section, and anywhere
// else a wilayah.kode needs to read as e.g. "Kabupaten Aceh Selatan"
// rather than "11.01". Null/missing codes are simply absent from the
// returned map rather than an error, since an incomplete address (not
// every account has completed one — see AppUser.hasCompleteAddress) is
// the normal case, not a failure.
export async function findWilayahNamesByCodes(
  codes: Array<string | null | undefined>,
  db: Queryable = pool,
): Promise<Map<string, string>> {
  const filtered = codes.filter((code): code is string => Boolean(code));
  if (filtered.length === 0) return new Map();

  const result = await db.query<WilayahOption>(`SELECT kode, nama FROM wilayah WHERE kode = ANY($1)`, [
    filtered,
  ]);
  return new Map(result.rows.map((row) => [row.kode, row.nama]));
}
