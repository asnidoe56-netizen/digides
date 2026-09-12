import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth/session";
import { recordAuditLog } from "@/repositories/audit.repository";
import { updateLandingMediaAlt } from "@/repositories/landing.repository";
import { MediaError, hapusGambar } from "@/services/media.service";

async function superAdmin() {
  const session = await getSession();
  if (!session || !session.roles.includes("SUPER_ADMIN")) return null;
  return session;
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await superAdmin();
  if (!session) return NextResponse.json({ error: "Tidak diizinkan" }, { status: 403 });

  const { id } = await params;
  const body = await request.json().catch(() => null);
  await updateLandingMediaAlt(id, String(body?.alt_text ?? "").slice(0, 300));
  revalidatePath("/");
  return NextResponse.json({ ok: true });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await superAdmin();
  if (!session) return NextResponse.json({ error: "Tidak diizinkan" }, { status: 403 });

  const { id } = await params;
  try {
    await hapusGambar(id);
    await recordAuditLog({
      actor_user_id: session.userId,
      action: "LANDING_MEDIA_DELETED",
      entity: "landing_media",
      entity_id: id,
    });
    revalidatePath("/");
    return NextResponse.json({ ok: true });
  } catch (caught) {
    if (caught instanceof MediaError) {
      return NextResponse.json({ error: caught.message }, { status: 400 });
    }
    console.error("Gagal menghapus gambar", caught);
    return NextResponse.json({ error: "Gagal menghapus gambar." }, { status: 500 });
  }
}
