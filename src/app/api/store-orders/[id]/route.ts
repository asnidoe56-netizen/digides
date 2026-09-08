import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getStoreOrderDetail } from "@/services/store-payment.service";

// The end-to-end trail behind one order — pesanan, item, permintaan bayar,
// ledger, stok (PRD §8's last acceptance criterion), and the data a struk
// is rendered from. Visible only to the two parties actually involved: the
// store's owner and the buyer who paid it.
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Tidak diizinkan" }, { status: 403 });
  }

  const { id } = await params;

  try {
    const detail = await getStoreOrderDetail(id, session.userId);
    return NextResponse.json(detail);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gagal memuat pesanan.";
    const status = message === "Anda tidak berhak melihat pesanan ini" ? 403 : 404;
    return NextResponse.json({ error: message }, { status });
  }
}
