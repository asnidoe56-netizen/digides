import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { runCatalogSync } from "@/jobs/catalog-sync";

// Manually triggered from the Products page's "Sinkronkan Sekarang"
// button. SUPER_ADMIN only — this calls out to Digiflazz using the real
// API key, and Digiflazz explicitly asks callers not to hit this
// endpoint carelessly ("gunakanlah secara bijak").
export async function POST() {
  const session = await getSession();
  if (!session || !session.roles.includes("SUPER_ADMIN")) {
    return NextResponse.json({ error: "Tidak diizinkan" }, { status: 403 });
  }

  try {
    const summary = await runCatalogSync();
    return NextResponse.json(summary);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Gagal sinkronisasi katalog." },
      { status: 502 },
    );
  }
}
