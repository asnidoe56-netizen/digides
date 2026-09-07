import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth/session";
import { recordAuditLog } from "@/repositories/audit.repository";
import { toPublicUserProfile, updateUserAddress } from "@/repositories/user.repository";

// The mitra app's "Lengkapi Profil" screen — reached from a blocking gate
// shown before any transaction (Pembelian/Transfer/Top Up) when the
// caller's address is incomplete (see PublicUserProfile's province_code
// etc.). All four levels are required here (unlike registerServerSchema's
// optional provinceCode/etc., which stays optional so the website's own
// registration form is unaffected) — completing this screen is exactly
// what makes the gate pass. Coordinate stays optional even here.
const addressSchema = z.object({
  provinceCode: z.string().regex(/^\d{2}$/, "Provinsi wajib dipilih"),
  regencyCode: z.string().regex(/^\d{2}\.\d{2}$/, "Kabupaten/Kota wajib dipilih"),
  districtCode: z.string().regex(/^\d{2}\.\d{2}\.\d{2}$/, "Kecamatan wajib dipilih"),
  villageCode: z.string().regex(/^\d{2}\.\d{2}\.\d{2}\.\d{4}$/, "Kelurahan/Desa wajib dipilih"),
  registrationLatitude: z.number().min(-90).max(90).optional(),
  registrationLongitude: z.number().min(-180).max(180).optional(),
});

export async function PATCH(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Tidak diizinkan" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = addressSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Data tidak valid", issues: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  try {
    const updated = await updateUserAddress(session.userId, {
      province_code: parsed.data.provinceCode,
      regency_code: parsed.data.regencyCode,
      district_code: parsed.data.districtCode,
      village_code: parsed.data.villageCode,
      registration_latitude: parsed.data.registrationLatitude ?? null,
      registration_longitude: parsed.data.registrationLongitude ?? null,
    });
    if (!updated) {
      return NextResponse.json({ error: "Pengguna tidak ditemukan" }, { status: 404 });
    }

    await recordAuditLog({
      actor_user_id: session.userId,
      action: "USER_ADDRESS_COMPLETED",
      entity: "users",
      entity_id: session.userId,
      new_value: {
        province_code: parsed.data.provinceCode,
        regency_code: parsed.data.regencyCode,
        district_code: parsed.data.districtCode,
        village_code: parsed.data.villageCode,
      },
    });

    return NextResponse.json({ user: toPublicUserProfile(updated) });
  } catch (error) {
    // Each *_code carries a FK into wilayah(kode) — a code that passed the
    // schema's format check but doesn't actually exist violates that FK.
    if (error && typeof error === "object" && "code" in error && error.code === "23503") {
      return NextResponse.json({ error: "Data alamat tidak valid" }, { status: 400 });
    }
    throw error;
  }
}
