import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getMyCommissionOverview } from "@/services/commission.service";

// The mobile app's Menu Mitra "Komisi" tab — the caller's own commission
// summary (pending/available/paid) and history, never another user's.
export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Tidak diizinkan" }, { status: 403 });
  }

  const overview = await getMyCommissionOverview(session.userId);
  return NextResponse.json(overview);
}
