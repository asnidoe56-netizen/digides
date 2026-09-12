import { NextResponse } from "next/server";
import { bukaBerkasGambar, findLandingMediaById } from "@/services/media.service";

/**
 * Gambar halaman depan, untuk siapa saja.
 *
 * Tidak menerima nama berkas dari luar, hanya id — endpoint gambar yang
 * menerima nama berkas adalah cara membaca berkas lain di server. Nama di
 * disk dicari dari basis data berdasarkan id itu.
 *
 * Boleh di-cache lama oleh peramban karena nama berkasnya disusun dari sidik
 * jari isinya: gambar yang berubah selalu punya id dan berkas baru, jadi
 * tidak ada gambar lama yang bisa tertinggal di cache seseorang.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) {
    return NextResponse.json({ error: "Tidak ditemukan" }, { status: 404 });
  }

  const media = await findLandingMediaById(id);
  if (!media) {
    return NextResponse.json({ error: "Gambar tidak ditemukan" }, { status: 404 });
  }

  const berkas = await bukaBerkasGambar(media);
  if (!berkas) {
    console.error("Berkas gambar tidak ada di disk", media.file_name);
    return NextResponse.json({ error: "Gambar tidak tersedia" }, { status: 503 });
  }

  return new NextResponse(berkas.stream as unknown as ReadableStream, {
    headers: {
      "Content-Type": media.mime_type,
      "Content-Length": String(berkas.size),
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
