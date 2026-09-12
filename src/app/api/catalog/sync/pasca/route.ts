import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { runPascaCatalogSync } from "@/jobs/catalog-sync";

// Sinkronisasi katalog PASCABAYAR, dipicu manual dari halaman Produk.
// Terpisah dari /api/catalog/sync (prabayar) karena bentuk datanya berbeda:
// tanpa harga tetap, dengan biaya admin dan komisi (PRD Pascabayar §7.11).
// SUPER_ADMIN saja — sama seperti sinkron prabayar, ini memanggil Digiflazz
// dengan API key sungguhan, dan mereka meminta endpoint ini dipakai bijak.
export async function POST() {
  const session = await getSession();
  if (!session || !session.roles.includes("SUPER_ADMIN")) {
    return NextResponse.json({ error: "Tidak diizinkan" }, { status: 403 });
  }

  try {
    const summary = await runPascaCatalogSync();
    return NextResponse.json(summary);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Gagal sinkronisasi katalog pascabayar." },
      { status: 502 },
    );
  }
}
