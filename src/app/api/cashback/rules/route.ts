import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth/session";
import { getCashbackRules, saveCashbackRule } from "@/services/cashback.service";

const createRuleSchema = z
  .object({
    scopeType: z.enum(["GLOBAL", "CATEGORY", "BRAND", "PRODUCT"]),
    categoryId: z.string().uuid().nullish(),
    brandId: z.string().uuid().nullish(),
    productId: z.string().uuid().nullish(),
    cashbackType: z.enum(["NOMINAL", "PERCENTAGE"]),
    cashbackValue: z.number().nonnegative(),
    minTransaction: z.number().int().nonnegative().nullish(),
    maxCashback: z.number().int().nonnegative().nullish(),
    priority: z.number().int().min(-32768).max(32767).optional(),
    effectiveUntil: z.string().datetime().nullish(),
  })
  // Cakupan diperiksa di sini juga, bukan hanya diserahkan ke exclusive-arc
  // CHECK di basis data. Keduanya perlu: CHECK adalah jaminannya, ini yang
  // memberi admin pesan yang bisa dimengerti alih-alih galat Postgres.
  .refine(
    (value) =>
      (value.scopeType === "GLOBAL" && !value.categoryId && !value.brandId && !value.productId) ||
      (value.scopeType === "CATEGORY" && !!value.categoryId && !value.brandId && !value.productId) ||
      (value.scopeType === "BRAND" && !!value.brandId && !value.categoryId && !value.productId) ||
      (value.scopeType === "PRODUCT" && !!value.productId && !value.categoryId && !value.brandId),
    { message: "Cakupan tidak sesuai dengan produk/brand/kategori yang dipilih" },
  );

export async function GET() {
  const session = await getSession();
  if (!session || !session.roles.includes("SUPER_ADMIN")) {
    return NextResponse.json({ error: "Tidak diizinkan" }, { status: 403 });
  }

  const rules = await getCashbackRules();
  return NextResponse.json({ rules });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session || !session.roles.includes("SUPER_ADMIN")) {
    return NextResponse.json({ error: "Tidak diizinkan" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = createRuleSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Data tidak valid" },
      { status: 400 },
    );
  }

  try {
    const rule = await saveCashbackRule(
      {
        scope_type: parsed.data.scopeType,
        category_id: parsed.data.categoryId ?? null,
        brand_id: parsed.data.brandId ?? null,
        product_id: parsed.data.productId ?? null,
        cashback_type: parsed.data.cashbackType,
        cashback_value: parsed.data.cashbackValue,
        min_transaction: parsed.data.minTransaction ?? null,
        max_cashback: parsed.data.maxCashback ?? null,
        priority: parsed.data.priority,
        effective_until: parsed.data.effectiveUntil ? new Date(parsed.data.effectiveUntil) : null,
      },
      session.userId,
    );
    return NextResponse.json({ rule }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Gagal menyimpan aturan cashback." },
      { status: 400 },
    );
  }
}
