import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getMyStore, getWalletForStore } from "@/services/store.service";

// Resolves the caller's own store the same trusted, server-side way every
// other "my own X" read does — never a client-supplied store id.
export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Tidak diizinkan" }, { status: 403 });
  }

  const store = await getMyStore(session.userId);
  if (!store) {
    return NextResponse.json({ store: null, wallet: null });
  }

  const wallet = await getWalletForStore(store.id);
  return NextResponse.json({ store, wallet });
}
