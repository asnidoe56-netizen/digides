import { createHash } from "node:crypto";
import { mkdir, rename, rm, stat, writeFile } from "node:fs/promises";
import { createReadStream } from "node:fs";
import { join, resolve } from "node:path";
import sharp from "sharp";
import type { OutputInfo } from "sharp";
import {
  createLandingMedia,
  deleteLandingMedia,
  findLandingMediaById,
  listLandingMedia,
} from "@/repositories/landing.repository";
import type { LandingMedia } from "@/types/landing";

/**
 * Gambar halaman depan disimpan di luar basis data DAN di luar folder
 * aplikasi, dengan alasan yang sama seperti berkas APK: `git pull` dan
 * `npm run build` menyentuh seluruh isi folder aplikasi, dan `public/`
 * hanya disalin saat build sehingga gambar yang diunggah sesudahnya tidak
 * akan pernah ikut. Di server nilainya diisi lewat MEDIA_STORAGE_DIR.
 */
export function mediaStorageDir(): string {
  return process.env.MEDIA_STORAGE_DIR
    ? resolve(process.env.MEDIA_STORAGE_DIR)
    : join(process.cwd(), "storage", "media");
}

/** Batas berkas yang diterima dari peramban, sebelum dikecilkan. */
export const MAX_MEDIA_BYTES = 20 * 1024 * 1024;

/**
 * Lebar terbesar gambar yang disimpan.
 *
 * Foto dari kamera atau dari pembuat gambar biasanya 1.500-4.000 piksel dan
 * berukuran beberapa megabita. Halaman depan tidak pernah menampilkannya
 * lebih lebar dari ini, jadi menyimpan aslinya berarti mengirim megabita
 * yang tidak pernah terlihat ke HP dengan sinyal desa.
 *
 * Pengecilan dilakukan SEKALI saat unggah, bukan tiap kali halaman dibuka.
 * Ini juga berarti admin boleh mengunggah foto mentah apa adanya — kalau
 * pengecilannya diserahkan kepada orang, cepat atau lambat ada foto 4 MB
 * yang lolos dan halamannya menjadi berat tanpa ada yang menyadari.
 */
const LEBAR_MAKS = 1600;

const JENIS_DITERIMA = ["image/jpeg", "image/png", "image/webp", "image/avif"];

export class MediaError extends Error {}

export interface SimpanGambarInput {
  bytes: Buffer;
  originalName: string;
  mimeType: string;
  altText: string;
  uploadedBy: string;
}

export async function simpanGambar(input: SimpanGambarInput): Promise<LandingMedia> {
  if (input.bytes.byteLength === 0) {
    throw new MediaError("Berkasnya kosong.");
  }
  if (input.bytes.byteLength > MAX_MEDIA_BYTES) {
    throw new MediaError("Gambar melebihi 20 MB.");
  }
  if (!JENIS_DITERIMA.includes(input.mimeType)) {
    throw new MediaError("Berkas harus berupa gambar JPG, PNG, WebP, atau AVIF.");
  }

  // Dibaca oleh sharp lebih dulu, bukan dipercaya dari jenis yang dikirim
  // peramban. Berkas yang mengaku gambar tapi bukan akan gagal di sini,
  // sebelum menyentuh disk.
  let olahan: { data: Buffer; info: OutputInfo };
  try {
    olahan = await sharp(input.bytes, { failOn: "error" })
      .rotate() // menghormati orientasi EXIF; tanpa ini foto dari HP bisa terbalik
      .resize({ width: LEBAR_MAKS, withoutEnlargement: true })
      .webp({ quality: 82 })
      .toBuffer({ resolveWithObject: true });
  } catch {
    throw new MediaError("Gambarnya tidak bisa dibaca. Coba simpan ulang lalu unggah lagi.");
  }

  const checksum = createHash("sha256").update(olahan.data).digest("hex");
  const fileName = `${checksum.slice(0, 16)}.webp`;
  const dir = mediaStorageDir();
  await mkdir(dir, { recursive: true });

  const tujuan = join(dir, fileName);
  const sementara = `${tujuan}.part`;

  // Kalau gambar dengan isi yang sama sudah pernah diunggah, berkasnya sudah
  // ada. Ditimpa boleh — isinya identik — tapi dicatat, supaya pembersihan
  // di bawah tahu bahwa bukan berkas ini yang ia buat.
  const berkasSudahAda = await stat(tujuan).then(
    () => true,
    () => false,
  );

  await writeFile(sementara, olahan.data);
  try {
    await rename(sementara, tujuan);
  } catch (caught) {
    await rm(sementara, { force: true });
    throw caught;
  }

  try {
    return await createLandingMedia({
      file_name: fileName,
      original_name: input.originalName.slice(0, 200),
      mime_type: "image/webp",
      file_size: olahan.data.byteLength,
      width: olahan.info.width,
      height: olahan.info.height,
      alt_text: input.altText.trim(),
      uploaded_by: input.uploadedBy,
    });
  } catch (caught) {
    if (!berkasSudahAda) {
      await rm(tujuan, { force: true });
    }
    const pesan = caught instanceof Error ? caught.message : "";
    if (pesan.includes("landing_media_file_name_key")) {
      throw new MediaError("Gambar yang isinya persis sama sudah ada di pustaka.");
    }
    throw caught;
  }
}

export async function daftarGambar(): Promise<LandingMedia[]> {
  return listLandingMedia();
}

/**
 * Menghapus gambar beserta berkasnya.
 *
 * Bagian dan butir yang memakainya TIDAK ikut terhapus: kolom media_id-nya
 * di-NULL-kan oleh basis data (ON DELETE SET NULL), sehingga yang terjadi
 * adalah gambar hilang dari halaman — bukan bagian halaman ikut hilang.
 */
export async function hapusGambar(id: string): Promise<void> {
  const media = await findLandingMediaById(id);
  if (!media) throw new MediaError("Gambar tidak ditemukan.");

  await deleteLandingMedia(id);
  await rm(join(mediaStorageDir(), media.file_name), { force: true });
}

/** Berkas siap dialirkan ke peramban, atau null kalau sudah tidak ada di disk. */
export async function bukaBerkasGambar(
  media: LandingMedia,
): Promise<{ stream: ReturnType<typeof createReadStream>; size: number } | null> {
  const jalur = join(mediaStorageDir(), media.file_name);
  try {
    const info = await stat(jalur);
    if (!info.isFile()) return null;
    return { stream: createReadStream(jalur), size: info.size };
  } catch {
    return null;
  }
}

export { findLandingMediaById };
