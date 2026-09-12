import { createHash } from "node:crypto";
import { mkdir, rename, rm, stat, writeFile } from "node:fs/promises";
import { createReadStream } from "node:fs";
import { join, resolve } from "node:path";
import { withTransaction } from "@/lib/db/transaction";
import {
  createAppRelease,
  deleteAppRelease,
  findActiveAppRelease,
  findAppReleaseByChecksum,
  findAppReleaseById,
  findAppReleaseByVersion,
  listAppReleases,
  setActiveAppRelease,
} from "@/repositories/app-release.repository";
import type { AppRelease, AppReleaseRow } from "@/types/app-release";

/**
 * Berkas APK disimpan di luar basis data DAN di luar folder aplikasi.
 *
 * Di luar folder aplikasi karena `git pull` dan `npm run build` menyentuh
 * seluruh isi folder itu; sebuah berkas 30 MB yang tidak ada di git akan
 * cepat atau lambat hilang di salah satu penerapan. Di server nilainya
 * diisi lewat APK_STORAGE_DIR di `.env`.
 *
 * Juga BUKAN di `public/` — Next.js menyalin seluruh isi `public/` ke dalam
 * hasil build, dan berkas yang diunggah setelah build tidak akan pernah ikut
 * tersalin. Unduhannya lewat Route Handler, bukan berkas statis.
 */
export function apkStorageDir(): string {
  return process.env.APK_STORAGE_DIR
    ? resolve(process.env.APK_STORAGE_DIR)
    : join(process.cwd(), "storage", "apk");
}

/**
 * Batas atas. APK mitra saat ini 28-31 MB, jadi 100 MB adalah kelonggaran
 * tiga kali lipat — bukan angka yang perlu ditambah, dan setiap megabita di
 * atasnya adalah memori yang bisa diminta orang lain untuk ditahan.
 */
export const MAX_APK_BYTES = 100 * 1024 * 1024;

/**
 * Empat byte pertama berkas ZIP — dan APK adalah ZIP.
 *
 * Memeriksa akhiran `.apk` saja tidak cukup: akhiran itu datang dari klien
 * dan bisa ditulis apa saja. Ini tidak membuktikan berkasnya APK yang sah
 * (memeriksa itu berarti membongkar isinya), tapi menolak berkas yang jelas
 * bukan arsip sama sekali.
 */
const ZIP_MAGIC = Buffer.from([0x50, 0x4b, 0x03, 0x04]);

export class AppReleaseError extends Error {}

/**
 * Nama berkas di disk disusun di sini, TIDAK PERNAH diambil dari klien.
 *
 * Nama berkas dari klien adalah cara paling langsung menulis ke luar folder
 * penyimpanan (`../../.env`). Di sini hanya angka versi yang dipakai, dan
 * itupun dibersihkan, lalu ditambah sidik jari isinya supaya dua unggahan
 * tidak pernah menimpa satu sama lain.
 */
function susunNamaBerkas(versionName: string, versionCode: number, checksum: string): string {
  const versi = versionName.replace(/[^0-9A-Za-z.]/g, "") || "tanpa-versi";
  return `digides-${versi}-${versionCode}-${checksum.slice(0, 12)}.apk`;
}

export interface SimpanRilisInput {
  versionName: string;
  versionCode: number;
  releaseNotes: string | null;
  originalFileName: string;
  bytes: Buffer;
  uploadedBy: string;
  /** Langsung dipakai halaman depan begitu selesai diunggah. */
  aktifkan: boolean;
}

export async function simpanRilis(input: SimpanRilisInput): Promise<AppRelease> {
  if (!/^[0-9]+(\.[0-9]+)*$/.test(input.versionName)) {
    throw new AppReleaseError("Nama versi harus berupa angka dan titik, contoh: 1.11.4");
  }
  if (!Number.isInteger(input.versionCode) || input.versionCode <= 0) {
    throw new AppReleaseError("Nomor build harus bilangan bulat lebih dari nol.");
  }
  if (!input.originalFileName.toLowerCase().endsWith(".apk")) {
    throw new AppReleaseError("Berkas harus berakhiran .apk");
  }
  if (input.bytes.byteLength === 0) {
    throw new AppReleaseError("Berkasnya kosong.");
  }
  if (input.bytes.byteLength > MAX_APK_BYTES) {
    throw new AppReleaseError("Berkas melebihi 100 MB.");
  }
  if (!input.bytes.subarray(0, 4).equals(ZIP_MAGIC)) {
    throw new AppReleaseError("Berkas ini bukan APK. Isinya bukan arsip Android yang sah.");
  }

  const checksum = createHash("sha256").update(input.bytes).digest("hex");

  // Ditolak SEBELUM berkasnya menyentuh disk, bukan sesudah.
  //
  // Nama berkas disusun dari versi dan sidik jari isinya, jadi mengunggah
  // APK yang sama dua kali menghasilkan nama berkas yang sama. Kalau
  // penolakannya baru terjadi di basis data, pembersihan setelah gagal akan
  // menghapus berkas milik rilis yang SUDAH ADA — dan kalau rilis itu yang
  // sedang tayang, tombol unduh di halaman depan mati tanpa ada yang tahu.
  const sudahAda = await findAppReleaseByChecksum(checksum);
  if (sudahAda) {
    throw new AppReleaseError(
      `Berkas ini persis sama dengan versi ${sudahAda.version_name} (${sudahAda.version_code}) yang sudah diunggah.`,
    );
  }
  const versiTerpakai = await findAppReleaseByVersion(input.versionName, input.versionCode);
  if (versiTerpakai) {
    throw new AppReleaseError(
      `Versi ${input.versionName} (${input.versionCode}) sudah pernah diunggah. Naikkan nomor versinya.`,
    );
  }

  const fileName = susunNamaBerkas(input.versionName, input.versionCode, checksum);
  const dir = apkStorageDir();
  await mkdir(dir, { recursive: true });

  // Ditulis ke nama sementara lalu diganti nama. `rename` di satu sistem
  // berkas bersifat atomik, jadi tidak pernah ada saat di mana berkas dengan
  // nama resminya sudah ada tapi isinya baru separuh — dan halaman depan
  // membaca berkas itu tanpa menunggu siapa pun.
  const tujuan = join(dir, fileName);
  const sementara = `${tujuan}.part`;

  // Kalau berkas dengan nama ini sudah ada padahal pemeriksaan di atas
  // mengatakan belum ada rilisnya, berarti ia berkas yatim dari unggahan
  // yang gagal separuh jalan. Ditimpa boleh — tapi dicatat, supaya
  // pembersihan di bawah tahu bahwa bukan berkas ini yang ia buat.
  const berkasSudahAda = await stat(tujuan).then(
    () => true,
    () => false,
  );

  await writeFile(sementara, input.bytes);
  try {
    await rename(sementara, tujuan);
  } catch (caught) {
    await rm(sementara, { force: true });
    throw caught;
  }

  try {
    return await withTransaction(async (client) => {
      const release = await createAppRelease(
        {
          version_name: input.versionName,
          version_code: input.versionCode,
          file_name: fileName,
          file_size: input.bytes.byteLength,
          checksum_sha256: checksum,
          release_notes: input.releaseNotes,
          uploaded_by: input.uploadedBy,
        },
        client,
      );
      if (input.aktifkan) {
        await setActiveAppRelease(release.id, client);
      }
      return { ...release, is_active: input.aktifkan };
    });
  } catch (caught) {
    // Catatannya gagal masuk, jadi berkas yang BARU SAJA ditulis di sini
    // tidak boleh tertinggal: berkas 30 MB tanpa baris yang menyebutnya
    // tidak akan pernah terlihat siapa pun lagi, dan tidak akan pernah
    // terhapus. Yang sudah ada sebelumnya ditinggalkan apa adanya — ia
    // mungkin milik rilis lain, dan menghapus berkas milik orang lain saat
    // membereskan kegagalan sendiri adalah kerusakan yang lebih besar
    // daripada kegagalannya.
    if (!berkasSudahAda) {
      await rm(tujuan, { force: true });
    }

    const pesan = caught instanceof Error ? caught.message : "";
    // Dua admin mengunggah bersamaan: pemeriksaan di atas sudah lewat untuk
    // keduanya, dan basis datalah yang memutuskan siapa yang menang.
    if (pesan.includes("app_releases_versi_unik") || pesan.includes("app_releases_file_name_key")) {
      throw new AppReleaseError(
        `Versi ${input.versionName} (${input.versionCode}) baru saja diunggah dari tempat lain.`,
      );
    }
    throw caught;
  }
}

export async function daftarRilis(): Promise<AppReleaseRow[]> {
  return listAppReleases();
}

export async function rilisAktif(): Promise<AppRelease | null> {
  return findActiveAppRelease();
}

export async function aktifkanRilis(id: string): Promise<AppRelease> {
  const release = await findAppReleaseById(id);
  if (!release) throw new AppReleaseError("Rilis tidak ditemukan.");
  await withTransaction(async (client) => setActiveAppRelease(id, client));
  return { ...release, is_active: true };
}

/**
 * Menghapus rilis beserta berkasnya.
 *
 * Rilis yang sedang aktif tidak bisa dihapus. Menghapusnya berarti tombol
 * "Unduh Aplikasi" di halaman depan berhenti bekerja tanpa ada yang tahu —
 * admin harus memindahkan tanda aktif ke rilis lain dulu, dan keputusan itu
 * harus disengaja.
 */
export async function hapusRilis(id: string): Promise<AppRelease> {
  const release = await findAppReleaseById(id);
  if (!release) throw new AppReleaseError("Rilis tidak ditemukan.");
  if (release.is_active) {
    throw new AppReleaseError(
      "Rilis ini sedang dipakai halaman depan. Aktifkan rilis lain dulu sebelum menghapusnya.",
    );
  }

  // Barisnya dulu, berkasnya kemudian. Kalau urutannya dibalik dan
  // penghapusan baris gagal, daftarnya akan memuat rilis yang berkasnya
  // sudah tidak ada — dan itu terlihat seperti sistem yang rusak.
  await deleteAppRelease(id);
  await rm(join(apkStorageDir(), release.file_name), { force: true });
  return release;
}

/** Berkas siap dialirkan ke pengunduh, atau null kalau sudah tidak ada di disk. */
export async function bukaBerkasRilis(
  release: AppRelease,
): Promise<{ stream: ReturnType<typeof createReadStream>; size: number } | null> {
  const jalur = join(apkStorageDir(), release.file_name);
  try {
    const info = await stat(jalur);
    if (!info.isFile()) return null;
    return { stream: createReadStream(jalur), size: info.size };
  } catch {
    return null;
  }
}
