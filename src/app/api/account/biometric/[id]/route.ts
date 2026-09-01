import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { revokeMyBiometricCredential } from "@/services/biometric.service";
import { recordAuditLog } from "@/repositories/audit.repository";

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Tidak diizinkan" }, { status: 403 });
  }

  const { id } = await params;

  try {
    await revokeMyBiometricCredential(session.userId, id);

    await recordAuditLog({
      actor_user_id: session.userId,
      action: "USER_BIOMETRIC_REVOKED",
      entity: "users",
      entity_id: session.userId,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gagal menghapus biometrik.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
