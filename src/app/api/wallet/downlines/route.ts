import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { listDirectDownlines } from "@/repositories/referral.repository";

// The mobile app's counterpart to /dashboard/konter/transfer's recipient
// picker — the caller's own direct, active downlines with their raw
// user_id (unlike /api/referrals/me's masked-balance view, POST
// /api/wallet/transfer needs an actual recipientUserId to send to).
export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Tidak diizinkan" }, { status: 403 });
  }

  const downlines = await listDirectDownlines(session.userId);
  return NextResponse.json({ downlines });
}
