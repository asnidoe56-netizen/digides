import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getPostpaidCatalog } from "@/services/postpaid.service";

// Daftar layanan tagihan yang aktif, untuk menu Bayar Tagihan di aplikasi
// mitra dan web. Dikelompokkan per brand di sisi klien — Digiflazz menaruh
// seluruh produk pascabayar dalam SATU kategori bernama "Pascabayar", jadi
// brand-lah yang bermakna bagi mitra (PRD Pascabayar §4).
export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Tidak diizinkan" }, { status: 403 });
  }

  const products = await getPostpaidCatalog();
  return NextResponse.json({ products });
}
