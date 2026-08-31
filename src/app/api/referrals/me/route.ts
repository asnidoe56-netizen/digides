import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getMitraOverview } from "@/services/referral.service";

// The mobile app's counterpart to /dashboard/konter/mitra (Menu Mitra) —
// the caller's own referral code plus their direct downlines with masked
// balances, same as getMitraOverview() already returns to that page.
export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Tidak diizinkan" }, { status: 403 });
  }

  const overview = await getMitraOverview(session.userId);
  return NextResponse.json(overview);
}
