import { NextResponse } from "next/server";
import { registerMitraServerSchema } from "@/features/mitra/schemas/register-mitra.schema";
import { requireRole } from "@/lib/auth/session";
import { registerMitra } from "@/services/bumdes.service";

// Mitra (BUMDes) accounts are always provisioned by a Super Admin — see
// bumdes.service.ts's registerMitra for why login, PIN, BUMDes record,
// and wallet are all created together.
export async function POST(request: Request) {
  const session = await requireRole("SUPER_ADMIN");
  if (!session) {
    return NextResponse.json({ error: "Tidak diizinkan" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = registerMitraServerSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Data tidak valid", issues: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  try {
    const result = await registerMitra({
      name: parsed.data.name,
      address: parsed.data.address || null,
      email: parsed.data.email,
      whatsapp: parsed.data.whatsapp,
      password: parsed.data.password,
      pin: parsed.data.pin,
      referralCode: parsed.data.referralCode || null,
      actorUserId: session.userId,
    });
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gagal mendaftarkan mitra.";
    const status =
      message === "Email sudah terdaftar" ||
      message === "Nomor WhatsApp sudah terdaftar" ||
      message === "Kode referensi tidak ditemukan"
        ? 409
        : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
