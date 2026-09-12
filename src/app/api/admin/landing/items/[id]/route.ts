import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth/session";
import { recordAuditLog } from "@/repositories/audit.repository";
import { LandingError, hapusButir, simpanButir } from "@/services/landing.service";

const BOLEH = [
  "group_key",
  "title",
  "subtitle",
  "body",
  "icon",
  "media_id",
  "link_label",
  "link_url",
  "data",
  "is_visible",
] as const;

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
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Data tidak terbaca." }, { status: 400 });
  }

  const masukan: Record<string, unknown> = {};
  for (const nama of BOLEH) {
    if (nama in body) masukan[nama] = body[nama];
  }

  try {
    const butir = await simpanButir(id, masukan);
    revalidatePath("/");
    return NextResponse.json({ item: butir });
  } catch (caught) {
    if (caught instanceof LandingError) {
      return NextResponse.json({ error: caught.message }, { status: 400 });
    }
    console.error("Gagal menyimpan butir halaman depan", caught);
    return NextResponse.json({ error: "Gagal menyimpan." }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await superAdmin();
  if (!session) return NextResponse.json({ error: "Tidak diizinkan" }, { status: 403 });

  const { id } = await params;
  try {
    const butir = await hapusButir(id);
    await recordAuditLog({
      actor_user_id: session.userId,
      action: "LANDING_ITEM_DELETED",
      entity: "landing_item",
      entity_id: id,
      old_value: { title: butir.title, group_key: butir.group_key },
    });
    revalidatePath("/");
    return NextResponse.json({ ok: true });
  } catch (caught) {
    if (caught instanceof LandingError) {
      return NextResponse.json({ error: caught.message }, { status: 400 });
    }
    console.error("Gagal menghapus butir halaman depan", caught);
    return NextResponse.json({ error: "Gagal menghapus." }, { status: 500 });
  }
}
