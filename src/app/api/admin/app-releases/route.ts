import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { recordAuditLog } from "@/repositories/audit.repository";
import {
  AppReleaseError,
  MAX_APK_BYTES,
  daftarRilis,
  simpanRilis,
} from "@/services/app-release.service";

// Unggahan APK hanya untuk Super Admin. Berkas yang diunggah di sini
// dipasang warga di HP mereka — tidak ada peran lain yang boleh memutuskan
// perangkat lunak apa yang dijalankan orang lain.
async function pastikanSuperAdmin() {
  const session = await getSession();
  if (!session || !session.roles.includes("SUPER_ADMIN")) return null;
  return session;
}

export async function GET() {
  const session = await pastikanSuperAdmin();
  if (!session) {
    return NextResponse.json({ error: "Tidak diizinkan" }, { status: 403 });
  }
  return NextResponse.json({ releases: await daftarRilis() });
}

export async function POST(request: Request) {
  const session = await pastikanSuperAdmin();
  if (!session) {
    return NextResponse.json({ error: "Tidak diizinkan" }, { status: 403 });
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    // Paling sering: Nginx memotong badan permintaan karena melebihi
    // client_max_body_size. Pesannya menyebut itu, karena "gagal membaca
    // berkas" akan membuat admin mencoba lagi sepuluh kali dengan hasil sama.
    return NextResponse.json(
      { error: "Berkas gagal diterima utuh. Kemungkinan besar ukurannya melebihi batas server." },
      { status: 413 },
    );
  }

  const berkas = form.get("file");
  if (!(berkas instanceof File)) {
    return NextResponse.json({ error: "Berkas APK belum dipilih." }, { status: 400 });
  }
  if (berkas.size > MAX_APK_BYTES) {
    return NextResponse.json({ error: "Berkas melebihi 100 MB." }, { status: 413 });
  }

  const versionName = String(form.get("version_name") ?? "").trim();
  const versionCode = Number.parseInt(String(form.get("version_code") ?? ""), 10);
  const catatan = String(form.get("release_notes") ?? "").trim();

  try {
    const release = await simpanRilis({
      versionName,
      versionCode,
      releaseNotes: catatan || null,
      originalFileName: berkas.name,
      bytes: Buffer.from(await berkas.arrayBuffer()),
      uploadedBy: session.userId,
      aktifkan: form.get("aktifkan") === "true",
    });

    await recordAuditLog({
      actor_user_id: session.userId,
      action: "APP_RELEASE_UPLOADED",
      entity: "app_release",
      entity_id: release.id,
      new_value: {
        version_name: release.version_name,
        version_code: release.version_code,
        file_size: release.file_size,
        checksum_sha256: release.checksum_sha256,
        is_active: release.is_active,
      },
    });

    return NextResponse.json({ release }, { status: 201 });
  } catch (caught) {
    if (caught instanceof AppReleaseError) {
      return NextResponse.json({ error: caught.message }, { status: 400 });
    }
    console.error("Gagal menyimpan rilis APK", caught);
    return NextResponse.json({ error: "Gagal menyimpan berkas." }, { status: 500 });
  }
}
