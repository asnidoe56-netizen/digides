import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth/session";
import { recordAuditLog } from "@/repositories/audit.repository";
import { LandingError, simpanBagian } from "@/services/landing.service";

// Kolom yang boleh diubah dari halaman admin. `key` dan `kind` sengaja TIDAK
// termasuk: keduanya adalah tali yang menghubungkan baris ini dengan
// komponen yang menggambarnya, dan mengubahnya dari formulir berarti sebuah
// bagian halaman hilang tanpa ada pesan kesalahan di mana pun.
const BOLEH = [
  "eyebrow",
  "title",
  "title_accent",
  "body",
  "body_secondary",
  "quote",
  "script_text",
  "media_id",
  "settings",
  "is_visible",
] as const;

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || !session.roles.includes("SUPER_ADMIN")) {
    return NextResponse.json({ error: "Tidak diizinkan" }, { status: 403 });
  }

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
    const bagian = await simpanBagian(id, masukan, session.userId);
    await recordAuditLog({
      actor_user_id: session.userId,
      action: "LANDING_SECTION_UPDATED",
      entity: "landing_section",
      entity_id: id,
      new_value: { key: bagian?.key, kolom: Object.keys(masukan) },
    });

    // Halaman depan disajikan dari cache. Tanpa baris ini, perubahan admin
    // baru terlihat setelah cache-nya kedaluwarsa sendiri — dan admin akan
    // menyimpan berkali-kali karena mengira tombolnya tidak bekerja.
    revalidatePath("/");
    return NextResponse.json({ section: bagian });
  } catch (caught) {
    if (caught instanceof LandingError) {
      return NextResponse.json({ error: caught.message }, { status: 400 });
    }
    console.error("Gagal menyimpan bagian halaman depan", caught);
    return NextResponse.json({ error: "Gagal menyimpan." }, { status: 500 });
  }
}
