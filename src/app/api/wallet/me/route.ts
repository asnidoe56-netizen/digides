import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getWalletForMitraSession } from "@/services/wallet.service";

// The Beranda balance card's refresh button — always resolves the wallet
// from the caller's own session (same resolver executeTransaction/
// wallet/transfer use), never a client-supplied id, so this can only ever
// read the caller's own balance.
export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Tidak diizinkan" }, { status: 403 });
  }

  const wallet = await getWalletForMitraSession(session.userId, session.roles);
  if (!wallet) {
    return NextResponse.json({ error: "Wallet tidak ditemukan untuk akun ini" }, { status: 404 });
  }

  return NextResponse.json({
    availableBalance: wallet.available_balance,
    heldBalance: wallet.held_balance,
  });
}
