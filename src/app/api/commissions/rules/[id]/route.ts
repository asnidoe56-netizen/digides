import { NextResponse } from "next/server";
import { z } from "zod";
import { commissionRuleSchema } from "@/features/commission/schemas/commission-rule.schema";
import { requireRole } from "@/lib/auth/session";
import { saveCommissionRule } from "@/services/commission.service";

const updateSchema = commissionRuleSchema.extend({ isActive: z.boolean() });

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireRole("SUPER_ADMIN");
  if (!session) {
    return NextResponse.json({ error: "Tidak diizinkan" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Data tidak valid", issues: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  try {
    const rule = await saveCommissionRule(
      {
        level: parsed.data.level,
        percentage: parsed.data.percentage,
        min_transaction: parsed.data.minTransaction ?? null,
        min_payout: parsed.data.minPayout,
        holding_period_days: parsed.data.holdingPeriodDays,
        eligible_category_id: parsed.data.eligibleCategoryId ?? null,
        max_commission: parsed.data.maxCommission ?? null,
      },
      session.userId,
      id,
    );
    return NextResponse.json({ rule }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Gagal menyimpan aturan komisi." },
      { status: 400 },
    );
  }
}
