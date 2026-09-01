import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getTransactionBiometricOptions } from "@/services/biometric.service";

// Step 1 of confirming a purchase with "Gunakan Biometrik" instead of a
// PIN — mirrors POST /api/products/[id]/live-price's "session is enough,
// no PIN needed yet" reasoning: generating a challenge doesn't move money,
// only the eventual /api/transactions/execute call does.
export async function POST() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Tidak diizinkan" }, { status: 403 });
  }

  try {
    const options = await getTransactionBiometricOptions(session.userId);
    return NextResponse.json(options);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gagal menyiapkan verifikasi biometrik.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
