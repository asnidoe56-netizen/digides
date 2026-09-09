import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { findStoreByOwnerUserId, listStoreSettlements } from "@/repositories/store.repository";

// A merchant's own record of "when did I move money out of my store".
// Always their own store, resolved from the session — a store id is never
// accepted from the request. An account with no store gets an empty list
// rather than an error: that is a normal state, not a failure.
export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Tidak diizinkan" }, { status: 403 });
  }

  const store = await findStoreByOwnerUserId(session.userId);
  if (!store) {
    return NextResponse.json({ settlements: [] });
  }

  const settlements = await listStoreSettlements(store.id);
  return NextResponse.json({ settlements });
}
