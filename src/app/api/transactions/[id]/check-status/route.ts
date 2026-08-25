import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/session";
import { checkTransactionStatus } from "@/services/transaction.service";

// The Transaksi monitoring page's one real action on a RESERVED
// transaction — resubmits the same ref_id to Digiflazz, which treats a
// repeat ref_id as a status check rather than a new purchase.
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireRole("SUPER_ADMIN");
  if (!session) {
    return NextResponse.json({ error: "Tidak diizinkan" }, { status: 403 });
  }

  const { id } = await params;

  try {
    const transaction = await checkTransactionStatus(id, session.userId);
    return NextResponse.json({ transaction }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Gagal memeriksa status transaksi." },
      { status: 400 },
    );
  }
}
