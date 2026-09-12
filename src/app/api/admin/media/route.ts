import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth/session";
import { recordAuditLog } from "@/repositories/audit.repository";
import { MAX_MEDIA_BYTES, MediaError, daftarGambar, simpanGambar } from "@/services/media.service";

async function superAdmin() {
  const session = await getSession();
  if (!session || !session.roles.includes("SUPER_ADMIN")) return null;
  return session;
}

export async function GET() {
  const session = await superAdmin();
  if (!session) return NextResponse.json({ error: "Tidak diizinkan" }, { status: 403 });
  return NextResponse.json({ media: await daftarGambar() });
}

export async function POST(request: Request) {
  const session = await superAdmin();
  if (!session) return NextResponse.json({ error: "Tidak diizinkan" }, { status: 403 });

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json(
      { error: "Gambar gagal diterima utuh. Kemungkinan ukurannya melebihi batas server." },
      { status: 413 },
    );
  }

  const berkas = form.get("file");
  if (!(berkas instanceof File)) {
    return NextResponse.json({ error: "Gambar belum dipilih." }, { status: 400 });
  }
  if (berkas.size > MAX_MEDIA_BYTES) {
    return NextResponse.json({ error: "Gambar melebihi 20 MB." }, { status: 413 });
  }

  try {
    const media = await simpanGambar({
      bytes: Buffer.from(await berkas.arrayBuffer()),
      originalName: berkas.name,
      mimeType: berkas.type,
      altText: String(form.get("alt_text") ?? ""),
      uploadedBy: session.userId,
    });

    await recordAuditLog({
      actor_user_id: session.userId,
      action: "LANDING_MEDIA_UPLOADED",
      entity: "landing_media",
      entity_id: media.id,
      new_value: { original_name: media.original_name, file_size: media.file_size },
    });

    revalidatePath("/");
    return NextResponse.json({ media }, { status: 201 });
  } catch (caught) {
    if (caught instanceof MediaError) {
      return NextResponse.json({ error: caught.message }, { status: 400 });
    }
    console.error("Gagal menyimpan gambar", caught);
    return NextResponse.json({ error: "Gagal menyimpan gambar." }, { status: 500 });
  }
}
