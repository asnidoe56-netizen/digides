import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth/session";
import { changeCashbackRule } from "@/services/cashback.service";

// Cakupan sengaja tidak ada di sini. Aturan yang berpindah dari satu produk
// ke produk lain akan membuat baris cashback_ledger lama menunjuk ke aturan
// yang tidak pernah membayarnya — sejarahnya jadi berbohong. Ganti cakupan
// berarti menonaktifkan yang lama dan membuat yang baru.
const updateRuleSchema = z
  .object({
    cashbackType: z.enum(["NOMINAL", "PERCENTAGE"]).optional(),
    cashbackValue: z.number().nonnegative().optional(),
    minTransaction: z.number().int().nonnegative().nullish(),
    maxCashback: z.number().int().nonnegative().nullish(),
    priority: z.number().int().min(-32768).max(32767).optional(),
    effectiveUntil: z.string().datetime().nullish(),
    isActive: z.boolean().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, { message: "Tidak ada perubahan yang dikirim" });

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || !session.roles.includes("SUPER_ADMIN")) {
    return NextResponse.json({ error: "Tidak diizinkan" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = updateRuleSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Data tidak valid" },
      { status: 400 },
    );
  }

  try {
    const rule = await changeCashbackRule(
      id,
      {
        cashback_type: parsed.data.cashbackType,
        cashback_value: parsed.data.cashbackValue,
        min_transaction: parsed.data.minTransaction,
        max_cashback: parsed.data.maxCashback,
        priority: parsed.data.priority,
        effective_until:
          parsed.data.effectiveUntil === undefined
            ? undefined
            : parsed.data.effectiveUntil === null
              ? null
              : new Date(parsed.data.effectiveUntil),
        is_active: parsed.data.isActive,
      },
      session.userId,
    );
    return NextResponse.json({ rule });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Gagal memperbarui aturan cashback." },
      { status: 400 },
    );
  }
}
