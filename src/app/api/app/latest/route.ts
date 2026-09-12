import { NextResponse } from "next/server";
import { rilisAktif } from "@/services/app-release.service";

export const dynamic = "force-dynamic";

/**
 * Keterangan versi untuk halaman depan: nomor versi, ukuran, tanggal.
 *
 * Terpisah dari halaman supaya halaman depannya tetap statis. Halaman depan
 * tidak boleh ikut gagal hanya karena basis data sedang sibuk — kalau
 * permintaan ini gagal, tombol unduhnya tetap ada, hanya keterangan versinya
 * yang tidak muncul.
 *
 * Tidak memuat nama berkas di disk, checksum, atau siapa yang mengunggah.
 */
export async function GET() {
  const release = await rilisAktif();
  if (!release) {
    return NextResponse.json({ release: null });
  }
  return NextResponse.json({
    release: {
      version_name: release.version_name,
      version_code: release.version_code,
      file_size: Number(release.file_size),
      released_at: release.created_at,
      release_notes: release.release_notes,
    },
  });
}
