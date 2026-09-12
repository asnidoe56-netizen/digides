import { withTransaction } from "@/lib/db/transaction";
import {
  createLandingItem,
  deleteLandingItem,
  findLandingItemById,
  findLandingSectionById,
  listLandingItems,
  listLandingMedia,
  listLandingSections,
  reorderLandingItems,
  setLandingSectionEditor,
  updateLandingItem,
  updateLandingSection,
} from "@/repositories/landing.repository";
import type {
  LandingMedia,
  LandingPage,
  LandingSectionFull,
  UpdateLandingSectionInput,
  UpsertLandingItemInput,
} from "@/types/landing";

export class LandingError extends Error {}

/**
 * Menyusun seluruh isi halaman depan dalam TIGA kueri, bukan satu kueri per
 * bagian.
 *
 * Halaman depan adalah alamat yang paling sering dibuka orang yang belum
 * punya akun, sering kali beramai-ramai setelah tautannya disebar di grup
 * desa. Satu kueri per bagian berarti belasan perjalanan ke basis data untuk
 * satu halaman yang isinya jarang berubah — beban yang tidak perlu, pada
 * basis data yang pada saat bersamaan sedang memproses transaksi.
 */
export async function ambilHalamanDepan(): Promise<LandingPage> {
  const [sections, items, media] = await Promise.all([
    listLandingSections(),
    listLandingItems(),
    listLandingMedia(),
  ]);

  const petaMedia = new Map<string, LandingMedia>(media.map((m) => [m.id, m]));
  const petaButir = new Map<string, LandingSectionFull["items"]>();

  for (const item of items) {
    if (!item.is_visible) continue;
    const daftar = petaButir.get(item.section_id) ?? [];
    daftar.push({ ...item, media: item.media_id ? (petaMedia.get(item.media_id) ?? null) : null });
    petaButir.set(item.section_id, daftar);
  }

  const lengkap: LandingSectionFull[] = sections.map((section) => ({
    ...section,
    media: section.media_id ? (petaMedia.get(section.media_id) ?? null) : null,
    items: petaButir.get(section.id) ?? [],
  }));

  const byKey: Record<string, LandingSectionFull | undefined> = {};
  for (const section of lengkap) byKey[section.key] = section;

  return { sections: lengkap, byKey };
}

/** Sama seperti di atas, tapi memuat butir tersembunyi — untuk halaman admin. */
export async function ambilHalamanDepanUntukAdmin(): Promise<LandingPage> {
  const [sections, items, media] = await Promise.all([
    listLandingSections(),
    listLandingItems(),
    listLandingMedia(),
  ]);

  const petaMedia = new Map<string, LandingMedia>(media.map((m) => [m.id, m]));
  const petaButir = new Map<string, LandingSectionFull["items"]>();

  for (const item of items) {
    const daftar = petaButir.get(item.section_id) ?? [];
    daftar.push({ ...item, media: item.media_id ? (petaMedia.get(item.media_id) ?? null) : null });
    petaButir.set(item.section_id, daftar);
  }

  const lengkap: LandingSectionFull[] = sections.map((section) => ({
    ...section,
    media: section.media_id ? (petaMedia.get(section.media_id) ?? null) : null,
    items: petaButir.get(section.id) ?? [],
  }));

  const byKey: Record<string, LandingSectionFull | undefined> = {};
  for (const section of lengkap) byKey[section.key] = section;

  return { sections: lengkap, byKey };
}

export async function simpanBagian(
  id: string,
  input: UpdateLandingSectionInput,
  actorUserId: string,
) {
  const ada = await findLandingSectionById(id);
  if (!ada) throw new LandingError("Bagian tidak ditemukan.");

  const hasil = await updateLandingSection(id, input);
  await setLandingSectionEditor(id, actorUserId);
  return hasil;
}

export async function tambahButir(input: UpsertLandingItemInput) {
  const section = await findLandingSectionById(input.section_id);
  if (!section) throw new LandingError("Bagian tidak ditemukan.");

  // Butir baru diletakkan di paling bawah kelompoknya. Menaruhnya di atas
  // akan menggeser urutan yang sudah disusun admin tanpa diminta.
  if (input.sort_order === undefined) {
    const semua = await listLandingItems();
    const sekelompok = semua.filter(
      (i) => i.section_id === input.section_id && i.group_key === (input.group_key ?? "utama"),
    );
    input.sort_order = sekelompok.reduce((maks, i) => Math.max(maks, i.sort_order), 0) + 10;
  }

  return createLandingItem(input);
}

export async function simpanButir(id: string, input: Omit<UpsertLandingItemInput, "section_id">) {
  const ada = await findLandingItemById(id);
  if (!ada) throw new LandingError("Butir tidak ditemukan.");
  return updateLandingItem(id, input);
}

export async function hapusButir(id: string) {
  const ada = await findLandingItemById(id);
  if (!ada) throw new LandingError("Butir tidak ditemukan.");
  await deleteLandingItem(id);
  return ada;
}

/**
 * Menukar posisi satu butir dengan tetangganya.
 *
 * Dilakukan dalam satu transaksi supaya tidak pernah ada saat di mana dua
 * butir memegang urutan yang sama — halaman depan yang dibaca pada saat itu
 * akan menampilkan keduanya dalam urutan yang ditentukan kebetulan.
 */
export async function geserButir(id: string, arah: "naik" | "turun") {
  const butir = await findLandingItemById(id);
  if (!butir) throw new LandingError("Butir tidak ditemukan.");

  const semua = await listLandingItems();
  const sekelompok = semua
    .filter((i) => i.section_id === butir.section_id && i.group_key === butir.group_key)
    .sort((a, b) => a.sort_order - b.sort_order || a.created_at.localeCompare(b.created_at));

  const posisi = sekelompok.findIndex((i) => i.id === id);
  const tujuan = arah === "naik" ? posisi - 1 : posisi + 1;
  if (posisi < 0 || tujuan < 0 || tujuan >= sekelompok.length) return;

  // Urutan ditulis ulang seluruhnya dengan kelipatan sepuluh, bukan sekadar
  // menukar dua angka. Data lama bisa punya urutan kembar atau nol semua,
  // dan menukar dua angka kembar tidak mengubah apa pun.
  const disusun = [...sekelompok];
  const [dipindah] = disusun.splice(posisi, 1);
  disusun.splice(tujuan, 0, dipindah);

  await withTransaction(async (client) => {
    await reorderLandingItems(
      disusun.map((i, urut) => ({ id: i.id, sort_order: (urut + 1) * 10 })),
      client,
    );
  });
}

// ── Pembacaan yang nyaman dipakai komponen ────────────────────────────────

/** Butir satu kelompok, sudah urut. */
export function butirKelompok(
  section: LandingSectionFull | undefined,
  grup = "utama",
): LandingSectionFull["items"] {
  if (!section) return [];
  return section.items
    .filter((i) => i.group_key === grup)
    .sort((a, b) => a.sort_order - b.sort_order || a.created_at.localeCompare(b.created_at));
}

/** Nilai dari `settings`, dengan bawaan kalau belum pernah diisi admin. */
export function pengaturan<T>(
  section: LandingSectionFull | undefined,
  nama: string,
  bawaan: T,
): T {
  const nilai = section?.settings?.[nama];
  return nilai === undefined || nilai === null || nilai === "" ? bawaan : (nilai as T);
}

/** Angka dari `data` sebuah butir, dengan bawaan. */
export function angkaData(
  item: { data: Record<string, unknown> } | undefined,
  nama: string,
  bawaan: number,
): number {
  const nilai = Number(item?.data?.[nama]);
  return Number.isFinite(nilai) ? nilai : bawaan;
}

/** Alamat gambar yang dipakai komponen. Null kalau bagian itu belum berfoto. */
export function urlGambar(media: LandingMedia | null | undefined): string | null {
  return media ? `/api/media/${media.id}` : null;
}
