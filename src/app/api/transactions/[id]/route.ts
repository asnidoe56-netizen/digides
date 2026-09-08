import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getTransactionDetail } from "@/services/transaction.service";
import { listReadableWalletIds } from "@/services/wallet.service";

// A mitra reading their own transaction — used by the purchase result
// screen's bounded status poll (category-purchase-flow.tsx) and the
// Histori detail page. Deliberately the read-only counterpart to
// /api/transactions/[id]/check-status (which is SUPER_ADMIN-only and
// re-submits to Digiflazz): this route never calls Digiflazz and never
// writes anything — it only reads whatever the webhook/reconciliation
// job has already settled into PostgreSQL, so it's safe to poll freely.
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Tidak diizinkan" }, { status: 403 });
  }

  const { id } = await params;
  // Every wallet this mitra may read, not just the one that pays: a
  // purchase funded from their own store's balance (payWith: "STORE")
  // belongs to the store wallet, and comparing against the operating
  // wallet alone made the buyer's own transaction 404 to them — the app's
  // status poll then never saw it settle and sat on "Memproses" forever.
  const readableWalletIds = await listReadableWalletIds(session.userId, session.roles);
  if (readableWalletIds.length === 0) {
    return NextResponse.json({ error: "Transaksi tidak ditemukan" }, { status: 404 });
  }

  const { transaction, balanceSummary } = await getTransactionDetail(id);
  // Same "tidak ditemukan" for a real 404 and an ownership mismatch —
  // never reveal that a transaction id exists but belongs to someone else.
  if (!transaction || !readableWalletIds.includes(transaction.wallet_id)) {
    return NextResponse.json({ error: "Transaksi tidak ditemukan" }, { status: 404 });
  }

  return NextResponse.json({ transaction, balance_summary: balanceSummary });
}
