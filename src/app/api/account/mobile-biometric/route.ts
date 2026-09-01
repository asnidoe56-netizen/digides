import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth/session";
import { recordAuditLog } from "@/repositories/audit.repository";
import { listMyMobileBiometricCredentials, registerMobileBiometricCredential } from "@/services/mobile-biometric.service";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Tidak diizinkan" }, { status: 403 });
  }

  const credentials = await listMyMobileBiometricCredentials(session.userId);
  return NextResponse.json({ credentials });
}

const registerSchema = z.object({
  credentialId: z.string().min(1),
  publicKey: z.string().min(1),
  algorithm: z.enum(["RSA", "ECDSA"]),
  platform: z.enum(["android", "ios"]),
  deviceLabel: z.string().trim().min(1).max(120),
});

// The Flutter app's counterpart to /api/account/biometric/register — no
// attestation to verify here (see mobile-biometric.service.ts), just
// recording the public key the device already generated in secure
// hardware, biometric-gated, before this call.
export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Tidak diizinkan" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Data tidak valid", issues: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  try {
    const credential = await registerMobileBiometricCredential(session.userId, parsed.data);

    await recordAuditLog({
      actor_user_id: session.userId,
      action: "USER_MOBILE_BIOMETRIC_REGISTERED",
      entity: "users",
      entity_id: session.userId,
      new_value: { device_label: credential.device_label, platform: credential.platform },
    });

    return NextResponse.json({ credential });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gagal mendaftarkan biometrik.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
