import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { recordAuditLog } from "@/repositories/audit.repository";
import { AppReleaseError, aktifkanRilis } from "@/services/app-release.service";

// Memindahkan tombol "Unduh Aplikasi" di halaman depan ke rilis lain.
// Dicatat di audit log: mengganti APK yang dipasang warga adalah keputusan
// yang harus bisa ditelusuri siapa yang mengambilnya dan kapan.
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || !session.roles.includes("SUPER_ADMIN")) {
    return NextResponse.json({ error: "Tidak diizinkan" }, { status: 403 });
  }

  const { id } = await params;
  try {
    const release = await aktifkanRilis(id);
    await recordAuditLog({
      actor_user_id: session.userId,
      action: "APP_RELEASE_ACTIVATED",
      entity: "app_release",
      entity_id: release.id,
      new_value: { version_name: release.version_name, version_code: release.version_code },
    });
    return NextResponse.json({ release });
  } catch (caught) {
    if (caught instanceof AppReleaseError) {
      return NextResponse.json({ error: caught.message }, { status: 400 });
    }
    console.error("Gagal mengaktifkan rilis APK", caught);
    return NextResponse.json({ error: "Gagal mengaktifkan rilis." }, { status: 500 });
  }
}
