import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getStorePaymentDetail } from "@/services/store-payment.service";

// PRD §5 step 4: any authenticated buyer who scanned the QR can read a
// payment request's public details (store name, items, total, status) —
// there is no pre-assigned buyer on a request, so this is intentionally
// not scoped to "my own" anything, only to being logged in at all.
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Tidak diizinkan" }, { status: 403 });
  }

  const { id } = await params;

  try {
    const detail = await getStorePaymentDetail(id);
    return NextResponse.json(detail);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Gagal memuat permintaan pembayaran." },
      { status: 404 },
    );
  }
}
