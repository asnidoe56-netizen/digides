import { NextResponse } from "next/server";
import { z } from "zod";
import { getLoginBiometricChallenge } from "@/services/mobile-biometric.service";

const schema = z.object({ credentialId: z.string().min(1) });

// Public — deliberately no session required (establishing one is the
// whole point of biometric login). Step 1 of the Flutter login screen's
// "Masuk dengan Sidik Jari": resolve which account this device's stored
// credentialId belongs to and hand back a fresh single-use challenge.
// Never reveals *why* a credentialId didn't resolve (same "don't
// distinguish" principle /api/auth/login already applies to unknown vs.
// wrong-password) — brute-forcing a valid credentialId is infeasible
// regardless (it's a 122-bit random UUID this app minted itself, never
// derived from anything guessable like an email).
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Data tidak valid" }, { status: 400 });
  }

  try {
    const options = await getLoginBiometricChallenge(parsed.data.credentialId);
    return NextResponse.json(options);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Login biometrik tidak tersedia.";
    return NextResponse.json({ error: message }, { status: 401 });
  }
}
