import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getMobileBiometricTransactionChallenge } from "@/services/mobile-biometric.service";

// Step 1 of the Flutter app's "Gunakan Biometrik" on the PIN screen —
// same reasoning as the web's /api/transactions/biometric-options:
// generating a challenge doesn't move money, only the eventual
// /api/transactions/execute call does.
export async function POST() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Tidak diizinkan" }, { status: 403 });
  }

  try {
    const options = await getMobileBiometricTransactionChallenge(session.userId);
    return NextResponse.json(options);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gagal menyiapkan verifikasi biometrik.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
