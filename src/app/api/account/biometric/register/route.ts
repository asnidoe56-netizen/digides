import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { verifyBiometricRegistration } from "@/services/biometric.service";
import { recordAuditLog } from "@/repositories/audit.repository";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Tidak diizinkan" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Data tidak valid" }, { status: 400 });
  }

  try {
    const credential = await verifyBiometricRegistration(session.userId, body, request.headers.get("user-agent"));

    await recordAuditLog({
      actor_user_id: session.userId,
      action: "USER_BIOMETRIC_REGISTERED",
      entity: "users",
      entity_id: session.userId,
      new_value: { device_label: credential.device_label },
    });

    return NextResponse.json({ credential });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gagal mendaftarkan biometrik.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
