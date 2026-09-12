import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { recordAuditLog } from "@/repositories/audit.repository";
import { AppReleaseError, hapusRilis } from "@/services/app-release.service";

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || !session.roles.includes("SUPER_ADMIN")) {
    return NextResponse.json({ error: "Tidak diizinkan" }, { status: 403 });
  }

  const { id } = await params;
  try {
    const release = await hapusRilis(id);
    await recordAuditLog({
      actor_user_id: session.userId,
      action: "APP_RELEASE_DELETED",
      entity: "app_release",
      entity_id: release.id,
      old_value: {
        version_name: release.version_name,
        version_code: release.version_code,
        file_name: release.file_name,
      },
    });
    return NextResponse.json({ ok: true });
  } catch (caught) {
    if (caught instanceof AppReleaseError) {
      return NextResponse.json({ error: caught.message }, { status: 400 });
    }
    console.error("Gagal menghapus rilis APK", caught);
    return NextResponse.json({ error: "Gagal menghapus rilis." }, { status: 500 });
  }
}
