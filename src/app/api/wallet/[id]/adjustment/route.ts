import { NextResponse } from "next/server";
import { adjustmentSchema } from "@/features/wallet/schemas/adjustment.schema";
import { requireRole } from "@/lib/auth/session";
import { createAdjustment } from "@/services/wallet.service";

// Adjustment is the one place a balance can move without an underlying
// transaction/top-up/commission — issue M18 section 13 restricts it to
// "role yang memiliki kewenangan"; for now that's SUPER_ADMIN only, the
// only role with a Wallet Management UI at all.
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireRole("SUPER_ADMIN");
  if (!session) {
    return NextResponse.json({ error: "Tidak diizinkan" }, { status: 403 });
  }

  const { id: walletId } = await params;
  const body = await request.json().catch(() => null);
  const parsed = adjustmentSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Data tidak valid", issues: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  try {
    const { wallet, ledgerEntry } = await createAdjustment({
      walletId,
      amount: parsed.data.amount,
      reason: parsed.data.reason,
      actorUserId: session.userId,
    });
    return NextResponse.json({ wallet, ledgerEntry }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Gagal membuat adjustment." },
      { status: 400 },
    );
  }
}
