import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth/session";
import { recordAuditLog } from "@/repositories/audit.repository";
import { LandingError, tambahButir } from "@/services/landing.service";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session || !session.roles.includes("SUPER_ADMIN")) {
    return NextResponse.json({ error: "Tidak diizinkan" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  if (!body?.section_id) {
    return NextResponse.json({ error: "Bagian belum ditentukan." }, { status: 400 });
  }

  try {
    const butir = await tambahButir({
      section_id: String(body.section_id),
      group_key: body.group_key ? String(body.group_key) : "utama",
      title: body.title ?? null,
      subtitle: body.subtitle ?? null,
      body: body.body ?? null,
      icon: body.icon ?? null,
      media_id: body.media_id ?? null,
      link_label: body.link_label ?? null,
      link_url: body.link_url ?? null,
      data: body.data ?? {},
      is_visible: body.is_visible ?? true,
    });

    await recordAuditLog({
      actor_user_id: session.userId,
      action: "LANDING_ITEM_CREATED",
      entity: "landing_item",
      entity_id: butir.id,
      new_value: { title: butir.title, group_key: butir.group_key },
    });

    revalidatePath("/");
    return NextResponse.json({ item: butir }, { status: 201 });
  } catch (caught) {
    if (caught instanceof LandingError) {
      return NextResponse.json({ error: caught.message }, { status: 400 });
    }
    console.error("Gagal menambah butir halaman depan", caught);
    return NextResponse.json({ error: "Gagal menambah." }, { status: 500 });
  }
}
