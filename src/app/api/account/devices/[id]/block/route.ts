import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { findSessionById } from "@/repositories/user-session.repository";
import { blockMyDevice } from "@/services/security.service";

// Akun > Perangkat's "Blokir Perangkat Ini" — the mitra-scoped counterpart
// to Super Admin's PATCH /api/security/devices/[id]/status. Ownership and
// the not-your-own-current-device guard both live in blockMyDevice.
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Tidak diizinkan" }, { status: 403 });
  }

  const { id } = await params;
  const currentSession = await findSessionById(session.sessionId);

  try {
    await blockMyDevice(session.userId, id, currentSession?.device_id ?? null);
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gagal memblokir perangkat.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
