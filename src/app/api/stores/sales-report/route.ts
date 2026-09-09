import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getMyStoreSalesReport } from "@/services/store-report.service";

// PRD Kasir Pintar §9 Tahap 4: penjualan dan untung per kategori, for the
// caller's own store. The store is resolved server-side from the session
// — a client never names a store id, so it cannot read anyone else's
// takings.
//
// `from`/`to` are optional ISO dates; omitted, the report covers today in
// the server's own timezone, which is the day the warung is standing in.
export async function GET(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Tidak diizinkan" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const fromParam = searchParams.get("from");
  const toParam = searchParams.get("to");
  const from = fromParam ? new Date(fromParam) : undefined;
  const to = toParam ? new Date(toParam) : undefined;

  if ((from && Number.isNaN(from.getTime())) || (to && Number.isNaN(to.getTime()))) {
    return NextResponse.json({ error: "Tanggal tidak valid" }, { status: 400 });
  }

  try {
    const report = await getMyStoreSalesReport(session.userId, { from, to });
    return NextResponse.json({ report });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Gagal memuat laporan." },
      { status: 400 },
    );
  }
}
