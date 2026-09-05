import { NextResponse } from "next/server";
import { commissionRuleSchema } from "@/features/commission/schemas/commission-rule.schema";
import { requireRole } from "@/lib/auth/session";
import { saveCommissionRuleForCategory } from "@/services/commission.service";

// Upserts both tiers' rule for one category at once — see
// commission.service.ts's saveCommissionRuleForCategory. Always POST,
// whether this category already had rules or not; there's no separate
// PATCH-by-id endpoint anymore since editing is keyed by category, not by
// an individual rule row.
export async function POST(request: Request) {
  const session = await requireRole("SUPER_ADMIN");
  if (!session) {
    return NextResponse.json({ error: "Tidak diizinkan" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = commissionRuleSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Data tidak valid", issues: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  try {
    const result = await saveCommissionRuleForCategory(
      {
        eligibleCategoryId: parsed.data.eligibleCategoryId ?? null,
        commissionType: parsed.data.commissionType,
        userAmount: parsed.data.userAmount ?? null,
        mitraAmount: parsed.data.mitraAmount ?? null,
        minTransaction: parsed.data.minTransaction ?? null,
        maxCommission: parsed.data.maxCommission ?? null,
        minPayout: parsed.data.minPayout,
        holdingPeriodDays: parsed.data.holdingPeriodDays,
      },
      session.userId,
    );
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Gagal menyimpan aturan komisi." },
      { status: 400 },
    );
  }
}
