import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { sumLedgerAmountsByType } from "@/repositories/wallet.repository";
import { sumTransactionVolume } from "@/repositories/transaction.repository";
import { getWalletForMitraSession } from "@/services/wallet.service";

// The mobile app's counterpart to the Rekap tab of
// /dashboard/konter/laporan — two aggregate queries (never a fetch-then-
// sum over individual rows), same as the web page: per-ledger-type sums
// for the window, and completed-purchase count/total value. The
// totalMasuk/totalKeluar/breakdown arithmetic itself (which ledger types
// count as "masuk" vs "keluar", which are excluded entirely) is simple
// enough to leave to the client rather than duplicating it here — see
// page.tsx's own inline computation, which this response's raw
// `typeSums` carries everything needed to reproduce exactly.
export async function GET(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Tidak diizinkan" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const dateFromParam = searchParams.get("dateFrom");
  const dateToParam = searchParams.get("dateTo");
  const dateFrom = dateFromParam ? new Date(dateFromParam) : undefined;
  const dateTo = dateToParam ? new Date(dateToParam) : undefined;

  const wallet = await getWalletForMitraSession(session.userId, session.roles);
  const filter = {
    walletId: wallet?.id,
    dateFrom: dateFrom && !isNaN(dateFrom.getTime()) ? dateFrom : undefined,
    dateTo: dateTo && !isNaN(dateTo.getTime()) ? dateTo : undefined,
  };

  const [typeSums, volume] = await Promise.all([
    wallet
      ? sumLedgerAmountsByType(filter)
      : Promise.resolve({
          TOPUP: "0",
          DEBIT: "0",
          RESERVE: "0",
          RELEASE: "0",
          REFUND: "0",
          COMMISSION: "0",
          PAYOUT: "0",
          ADJUSTMENT: "0",
          TRANSFER_OUT: "0",
          TRANSFER_IN: "0",
        }),
    wallet ? sumTransactionVolume(filter) : Promise.resolve({ count: 0, total_value: "0" }),
  ]);

  return NextResponse.json({ typeSums, transactionCount: volume.count, transactionTotalValue: volume.total_value });
}
