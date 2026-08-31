import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getTransactionCount, getTransactionList } from "@/services/transaction.service";
import { getWalletForMitraSession } from "@/services/wallet.service";

const PAGE_SIZE = 20;

// The mobile app's counterpart to /dashboard/konter/histori (bare, no
// dateFrom/dateTo) AND the Transaksi tab of /dashboard/konter/laporan
// (with them) — same walletId-resolution and same getTransactionList/
// getTransactionCount pair either way, walletId always resolved
// server-side from the session, never a client-supplied id.
export async function GET(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Tidak diizinkan" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const dateFromParam = searchParams.get("dateFrom");
  const dateToParam = searchParams.get("dateTo");
  const dateFrom = dateFromParam ? new Date(dateFromParam) : undefined;
  const dateTo = dateToParam ? new Date(dateToParam) : undefined;

  const wallet = await getWalletForMitraSession(session.userId, session.roles);
  const filter = {
    walletId: wallet?.id,
    dateFrom: dateFrom && !isNaN(dateFrom.getTime()) ? dateFrom : undefined,
    dateTo: dateTo && !isNaN(dateTo.getTime()) ? dateTo : undefined,
    limit: PAGE_SIZE,
    offset: (page - 1) * PAGE_SIZE,
  };

  const [transactions, total] = await Promise.all([
    wallet ? getTransactionList(filter) : Promise.resolve([]),
    wallet ? getTransactionCount(filter) : Promise.resolve(0),
  ]);

  return NextResponse.json({ transactions, page, totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)) });
}
