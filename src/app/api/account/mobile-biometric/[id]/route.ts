import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { revokeMyMobileBiometricCredential } from "@/services/mobile-biometric.service";
import { recordAuditLog } from "@/repositories/audit.repository";

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Tidak diizinkan" }, { status: 403 });
  }

  const { id } = await params;

  try {
    await revokeMyMobileBiometricCredential(session.userId, id);

    await recordAuditLog({
      actor_user_id: session.userId,
      action: "USER_MOBILE_BIOMETRIC_REVOKED",
      entity: "users",
      entity_id: session.userId,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gagal menghapus biometrik.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
