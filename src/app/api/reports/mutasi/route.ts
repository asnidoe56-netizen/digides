import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { countLedgerGlobal, listLedgerGlobal } from "@/repositories/wallet.repository";
import { getWalletForMitraSession } from "@/services/wallet.service";

const PAGE_SIZE = 20;

// The mobile app's counterpart to the Mutasi tab of
// /dashboard/konter/laporan — no dedicated service-layer wrapper exists
// for this on the web side either (that page calls
// listLedgerGlobal/countLedgerGlobal straight from the repository), so
// this route does the same. walletId always resolved server-side from
// the session, never a client-supplied id — same resolver every other
// mitra-scoped wallet endpoint uses.
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

  const [entries, total] = await Promise.all([
    wallet ? listLedgerGlobal(filter) : Promise.resolve([]),
    wallet ? countLedgerGlobal(filter) : Promise.resolve(0),
  ]);

  return NextResponse.json({ entries, page, totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)) });
}
