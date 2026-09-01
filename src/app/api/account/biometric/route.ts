import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { listMyBiometricCredentials } from "@/services/biometric.service";

// Akun > Keamanan's device list — "enabled" for this account is simply
// "this list isn't empty", not a separate toggle that could drift out of
// sync with what's actually registered.
export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Tidak diizinkan" }, { status: 403 });
  }

  const credentials = await listMyBiometricCredentials(session.userId);
  return NextResponse.json({ credentials });
}
