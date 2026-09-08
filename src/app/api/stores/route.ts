import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession, requireRole } from "@/lib/auth/session";
import { countStoresForAdmin, listStoresForAdmin } from "@/repositories/store.repository";
import { registerStore } from "@/services/store.service";
import type { StoreStatus } from "@/types/store";

const STORE_STATUSES: StoreStatus[] = ["DRAFT", "SUBMITTED", "ACTIVE", "SUSPENDED", "CLOSED"];

// Super Admin only: the store list behind the Toko menu, which is where a
// store waiting for verification is actually seen. A store owner reads
// their own store through GET /api/stores/me instead — this endpoint is
// never scoped to the caller, so it must stay behind the role gate.
export async function GET(request: Request) {
  const session = await requireRole("SUPER_ADMIN");
  if (!session) {
    return NextResponse.json({ error: "Tidak diizinkan" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const statusParam = searchParams.get("status");
  const status = STORE_STATUSES.find((candidate) => candidate === statusParam);
  const search = searchParams.get("search")?.trim() || undefined;
  const limit = Math.min(Math.max(Number(searchParams.get("limit")) || 20, 1), 100);
  const page = Math.max(Number(searchParams.get("page")) || 1, 1);

  const filter = { status, search, limit, offset: (page - 1) * limit };
  const [stores, total] = await Promise.all([
    listStoresForAdmin(filter),
    countStoresForAdmin(filter),
  ]);

  return NextResponse.json({ stores, total, page, limit });
}

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
