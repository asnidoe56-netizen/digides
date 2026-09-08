import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth/session";
import { registerStore } from "@/services/store.service";

// Same optional-but-format-checked shape as registerServerSchema's address
// fields (register/route.ts) — a store can be registered without an
// address for now, matching how user registration itself treats address
// as optional at the API layer.
const registerStoreSchema = z.object({
  name: z.string().trim().min(1, "Nama toko wajib diisi"),
  provinceCode: z.string().regex(/^\d{2}$/).optional(),
  regencyCode: z.string().regex(/^\d{2}\.\d{2}$/).optional(),
  districtCode: z.string().regex(/^\d{2}\.\d{2}\.\d{2}$/).optional(),
  villageCode: z.string().regex(/^\d{2}\.\d{2}\.\d{2}\.\d{4}$/).optional(),
  addressDetail: z.string().trim().max(500).optional(),
});

// Self-service store registration — the owner is always the current
// session's own user, never a client-supplied id (mirrors every other
// "my own X" write in this codebase).
export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Tidak diizinkan" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = registerStoreSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Data tidak valid", issues: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  try {
    const { store, wallet } = await registerStore({
      ownerUserId: session.userId,
      name: parsed.data.name,
      provinceCode: parsed.data.provinceCode ?? null,
      regencyCode: parsed.data.regencyCode ?? null,
      districtCode: parsed.data.districtCode ?? null,
      villageCode: parsed.data.villageCode ?? null,
      addressDetail: parsed.data.addressDetail ?? null,
    });
    return NextResponse.json({ store, wallet }, { status: 201 });
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "23503") {
      return NextResponse.json({ error: "Data alamat tidak valid" }, { status: 400 });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Gagal mendaftarkan toko." },
      { status: 400 },
    );
  }
}
