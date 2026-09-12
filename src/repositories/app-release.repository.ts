import type { Queryable } from "@/lib/db/query";
import { pool } from "@/lib/db/pool";
import type { AppRelease, AppReleaseRow, CreateAppReleaseInput } from "@/types/app-release";

export async function createAppRelease(
  input: CreateAppReleaseInput,
  db: Queryable = pool,
): Promise<AppRelease> {
  const result = await db.query<AppRelease>(
    `INSERT INTO app_releases
       (version_name, version_code, file_name, file_size, checksum_sha256, release_notes, uploaded_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [
      input.version_name,
      input.version_code,
      input.file_name,
      input.file_size,
      input.checksum_sha256,
      input.release_notes,
      input.uploaded_by,
    ],
  );
  return result.rows[0];
}

export async function listAppReleases(db: Queryable = pool): Promise<AppReleaseRow[]> {
  const result = await db.query<AppReleaseRow>(
    `SELECT r.*, u.full_name AS uploader_name
       FROM app_releases r
       LEFT JOIN users u ON u.id = r.uploaded_by
      ORDER BY r.created_at DESC`,
  );
  return result.rows;
}

export async function findAppReleaseById(
  id: string,
  db: Queryable = pool,
): Promise<AppRelease | null> {
  const result = await db.query<AppRelease>(`SELECT * FROM app_releases WHERE id = $1`, [id]);
  return result.rows[0] ?? null;
}

/** Rilis yang sedang ditayangkan di halaman depan. Null kalau belum ada. */
export async function findActiveAppRelease(db: Queryable = pool): Promise<AppRelease | null> {
  const result = await db.query<AppRelease>(`SELECT * FROM app_releases WHERE is_active LIMIT 1`);
  return result.rows[0] ?? null;
}

/**
 * Memindahkan tanda aktif ke satu rilis.
 *
 * Menonaktifkan yang lama DULU, baru menandai yang baru — bukan sebaliknya.
 * Indeks unik parsial di basis data menolak dua baris aktif, jadi urutan
 * terbalik akan gagal di tengah jalan. Keduanya dalam satu transaksi
 * supaya tidak pernah ada saat di mana tidak ada satu pun rilis aktif.
 */
export async function setActiveAppRelease(id: string, db: Queryable): Promise<void> {
  await db.query(`UPDATE app_releases SET is_active = false WHERE is_active AND id <> $1`, [id]);
  await db.query(`UPDATE app_releases SET is_active = true WHERE id = $1`, [id]);
}

export async function deleteAppRelease(id: string, db: Queryable = pool): Promise<void> {
  await db.query(`DELETE FROM app_releases WHERE id = $1`, [id]);
}

/**
 * Rilis dengan isi berkas yang persis sama, apa pun nomor versinya.
 *
 * Dipakai untuk menolak unggahan ganda SEBELUM berkasnya ditulis ke disk:
 * nama berkas disusun dari versi dan sidik jari isinya, jadi dua unggahan
 * yang sama persis akan menghasilkan nama berkas yang sama pula.
 */
export async function findAppReleaseByChecksum(
  checksum: string,
  db: Queryable = pool,
): Promise<AppRelease | null> {
  const result = await db.query<AppRelease>(
    `SELECT * FROM app_releases WHERE checksum_sha256 = $1 LIMIT 1`,
    [checksum],
  );
  return result.rows[0] ?? null;
}

export async function findAppReleaseByVersion(
  versionName: string,
  versionCode: number,
  db: Queryable = pool,
): Promise<AppRelease | null> {
  const result = await db.query<AppRelease>(
    `SELECT * FROM app_releases WHERE version_name = $1 AND version_code = $2 LIMIT 1`,
    [versionName, versionCode],
  );
  return result.rows[0] ?? null;
}
