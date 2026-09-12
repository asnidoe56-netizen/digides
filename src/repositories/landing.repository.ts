import type { Queryable } from "@/lib/db/query";
import { pool } from "@/lib/db/pool";
import type {
  CreateLandingMediaInput,
  LandingItem,
  LandingMedia,
  LandingSection,
  UpdateLandingSectionInput,
  UpsertLandingItemInput,
} from "@/types/landing";

// ── Gambar ─────────────────────────────────────────────────────────────────

export async function createLandingMedia(
  input: CreateLandingMediaInput,
  db: Queryable = pool,
): Promise<LandingMedia> {
  const result = await db.query<LandingMedia>(
    `INSERT INTO landing_media
       (file_name, original_name, mime_type, file_size, width, height, alt_text, uploaded_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING *`,
    [
      input.file_name,
      input.original_name,
      input.mime_type,
      input.file_size,
      input.width,
      input.height,
      input.alt_text,
      input.uploaded_by,
    ],
  );
  return result.rows[0];
}

export async function listLandingMedia(db: Queryable = pool): Promise<LandingMedia[]> {
  const result = await db.query<LandingMedia>(
    `SELECT * FROM landing_media ORDER BY created_at DESC`,
  );
  return result.rows;
}

export async function findLandingMediaById(
  id: string,
  db: Queryable = pool,
): Promise<LandingMedia | null> {
  const result = await db.query<LandingMedia>(`SELECT * FROM landing_media WHERE id = $1`, [id]);
  return result.rows[0] ?? null;
}

export async function updateLandingMediaAlt(
  id: string,
  altText: string,
  db: Queryable = pool,
): Promise<void> {
  await db.query(`UPDATE landing_media SET alt_text = $2 WHERE id = $1`, [id, altText]);
}

export async function deleteLandingMedia(id: string, db: Queryable = pool): Promise<void> {
  await db.query(`DELETE FROM landing_media WHERE id = $1`, [id]);
}

// ── Bagian ─────────────────────────────────────────────────────────────────

export async function listLandingSections(db: Queryable = pool): Promise<LandingSection[]> {
  const result = await db.query<LandingSection>(
    `SELECT * FROM landing_sections ORDER BY sort_order, key`,
  );
  return result.rows;
}

export async function findLandingSectionById(
  id: string,
  db: Queryable = pool,
): Promise<LandingSection | null> {
  const result = await db.query<LandingSection>(`SELECT * FROM landing_sections WHERE id = $1`, [
    id,
  ]);
  return result.rows[0] ?? null;
}

/**
 * Memperbarui bagian, hanya kolom yang benar-benar dikirim.
 *
 * Dibangun sebagai SQL bertahap, bukan satu UPDATE yang menyebut semua
 * kolom: formulir admin mengirim satu bagian saja, dan UPDATE yang menyebut
 * semua kolom akan mengosongkan kolom yang tidak ada di formulir itu.
 */
export async function updateLandingSection(
  id: string,
  input: UpdateLandingSectionInput,
  db: Queryable = pool,
): Promise<LandingSection | null> {
  const kolom: string[] = [];
  const nilai: unknown[] = [id];

  const bolehDiubah = [
    "eyebrow",
    "title",
    "title_accent",
    "body",
    "body_secondary",
    "quote",
    "script_text",
    "media_id",
    "settings",
    "is_visible",
    "sort_order",
  ] as const;

  for (const nama of bolehDiubah) {
    if (!(nama in input)) continue;
    const isi = input[nama];
    nilai.push(nama === "settings" ? JSON.stringify(isi ?? {}) : isi);
    kolom.push(`${nama} = $${nilai.length}${nama === "settings" ? "::jsonb" : ""}`);
  }

  if (kolom.length === 0) return findLandingSectionById(id, db);

  const result = await db.query<LandingSection>(
    `UPDATE landing_sections
        SET ${kolom.join(", ")}, updated_at = now()
      WHERE id = $1
      RETURNING *`,
    nilai,
  );
  return result.rows[0] ?? null;
}

export async function setLandingSectionEditor(
  id: string,
  userId: string,
  db: Queryable = pool,
): Promise<void> {
  await db.query(`UPDATE landing_sections SET updated_by = $2 WHERE id = $1`, [id, userId]);
}

// ── Butir ──────────────────────────────────────────────────────────────────

export async function listLandingItems(db: Queryable = pool): Promise<LandingItem[]> {
  const result = await db.query<LandingItem>(
    `SELECT * FROM landing_items ORDER BY section_id, group_key, sort_order, created_at`,
  );
  return result.rows;
}

export async function findLandingItemById(
  id: string,
  db: Queryable = pool,
): Promise<LandingItem | null> {
  const result = await db.query<LandingItem>(`SELECT * FROM landing_items WHERE id = $1`, [id]);
  return result.rows[0] ?? null;
}

export async function createLandingItem(
  input: UpsertLandingItemInput,
  db: Queryable = pool,
): Promise<LandingItem> {
  const result = await db.query<LandingItem>(
    `INSERT INTO landing_items
       (section_id, group_key, title, subtitle, body, icon, media_id,
        link_label, link_url, data, is_visible, sort_order)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb, $11, $12)
     RETURNING *`,
    [
      input.section_id,
      input.group_key ?? "utama",
      input.title ?? null,
      input.subtitle ?? null,
      input.body ?? null,
      input.icon ?? null,
      input.media_id ?? null,
      input.link_label ?? null,
      input.link_url ?? null,
      JSON.stringify(input.data ?? {}),
      input.is_visible ?? true,
      input.sort_order ?? 0,
    ],
  );
  return result.rows[0];
}

export async function updateLandingItem(
  id: string,
  input: Omit<UpsertLandingItemInput, "section_id">,
  db: Queryable = pool,
): Promise<LandingItem | null> {
  const kolom: string[] = [];
  const nilai: unknown[] = [id];

  const bolehDiubah = [
    "group_key",
    "title",
    "subtitle",
    "body",
    "icon",
    "media_id",
    "link_label",
    "link_url",
    "data",
    "is_visible",
    "sort_order",
  ] as const;

  for (const nama of bolehDiubah) {
    if (!(nama in input)) continue;
    const isi = input[nama];
    nilai.push(nama === "data" ? JSON.stringify(isi ?? {}) : isi);
    kolom.push(`${nama} = $${nilai.length}${nama === "data" ? "::jsonb" : ""}`);
  }

  if (kolom.length === 0) return findLandingItemById(id, db);

  const result = await db.query<LandingItem>(
    `UPDATE landing_items
        SET ${kolom.join(", ")}, updated_at = now()
      WHERE id = $1
      RETURNING *`,
    nilai,
  );
  return result.rows[0] ?? null;
}

export async function deleteLandingItem(id: string, db: Queryable = pool): Promise<void> {
  await db.query(`DELETE FROM landing_items WHERE id = $1`, [id]);
}

/** Urutan baru untuk sekumpulan butir, dipakai tombol naik/turun di admin. */
export async function reorderLandingItems(
  urutan: { id: string; sort_order: number }[],
  db: Queryable,
): Promise<void> {
  for (const baris of urutan) {
    await db.query(`UPDATE landing_items SET sort_order = $2, updated_at = now() WHERE id = $1`, [
      baris.id,
      baris.sort_order,
    ]);
  }
}
