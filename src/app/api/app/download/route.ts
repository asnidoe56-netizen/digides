import { NextResponse } from "next/server";
import { bukaBerkasRilis, rilisAktif } from "@/services/app-release.service";

// Tidak pernah di-cache: yang diunduh harus selalu rilis yang aktif HARI INI.
// Kalau sebuah versi ditarik karena rusak, tautan yang sudah tersebar di
// grup WhatsApp desa tidak boleh tetap memberikan berkas yang lama.
export const dynamic = "force-dynamic";

/**
 * Unduhan APK untuk publik, dari tombol di halaman depan.
 *
 * Tanpa sesi — memang untuk siapa saja. Tidak ada parameter apa pun: rilis
 * mana yang diberikan ditentukan oleh tanda aktif di basis data, bukan oleh
 * yang mengetik alamatnya. Endpoint unduhan yang menerima nama berkas dari
 * luar adalah cara membaca berkas lain di server.
 */
export async function GET() {
  const release = await rilisAktif();
  if (!release) {
    return NextResponse.json(
      { error: "Aplikasi belum tersedia untuk diunduh. Silakan coba beberapa saat lagi." },
      { status: 404 },
    );
  }

  const berkas = await bukaBerkasRilis(release);
  if (!berkas) {
    // Barisnya ada tapi berkasnya tidak — layak dicatat, karena artinya ada
    // yang menghapus berkas di server di luar halaman admin.
    console.error("Berkas rilis aktif tidak ditemukan di disk", release.file_name);
    return NextResponse.json({ error: "Berkas aplikasi sedang tidak tersedia." }, { status: 503 });
  }

  const namaUnduhan = `DigidesPay-${release.version_name}.apk`;
  return new NextResponse(berkas.stream as unknown as ReadableStream, {
    headers: {
      "Content-Type": "application/vnd.android.package-archive",
      "Content-Length": String(berkas.size),
      "Content-Disposition": `attachment; filename="${namaUnduhan}"`,
      // Sidik jari berkasnya ikut dikirim supaya siapa pun bisa membuktikan
      // yang sampai di HP-nya sama dengan yang diunggah admin.
      "X-Checksum-Sha256": release.checksum_sha256,
      "Cache-Control": "no-store",
    },
  });
}
