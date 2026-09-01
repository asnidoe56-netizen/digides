import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getBiometricRegistrationOptions } from "@/services/biometric.service";

export async function POST() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Tidak diizinkan" }, { status: 403 });
  }

  try {
    const options = await getBiometricRegistrationOptions(session.userId);
    return NextResponse.json(options);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gagal menyiapkan pendaftaran biometrik.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
