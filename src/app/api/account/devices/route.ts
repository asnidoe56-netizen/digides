import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { findSessionById } from "@/repositories/user-session.repository";
import { getMyDevices } from "@/services/security.service";

// Akun > Perangkat — the mitra's own devices/sessions view, scoped to
// their own account (see security.service.ts's getMyDevices). The
// caller's own session row is looked up once here so the response can
// mark which device row is the one making this very request ("Sedang
// digunakan"), the same way the Flutter app already means the same thing
// when it checks its own credential against the account's device list.
export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Tidak diizinkan" }, { status: 403 });
  }

  const currentSession = await findSessionById(session.sessionId);
  const overview = await getMyDevices(session.userId, currentSession?.device_id ?? null);
  return NextResponse.json(overview);
}
