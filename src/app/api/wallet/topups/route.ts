import { NextResponse } from "next/server";
import { topupRequestSchema } from "@/features/wallet/schemas/topup.schema";
import { requireRole } from "@/lib/auth/session";
import { createTopupRequest } from "@/services/wallet-topup.service";

// Creating a request never credits the wallet by itself (issue M18
// section 12: no "Tambah Saldo" shortcut) — only PATCH .../topups/[id]
// approving it does that, in a separate action.
export async function POST(request: Request) {
  const session = await requireRole("SUPER_ADMIN");
  if (!session) {
    return NextResponse.json({ error: "Tidak diizinkan" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = topupRequestSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Data tidak valid", issues: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  try {
    const payment = await createTopupRequest({
      walletId: parsed.data.walletId,
      amount: parsed.data.amount,
      actorUserId: session.userId,
    });
    return NextResponse.json(payment, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Gagal membuat permintaan top up." },
      { status: 400 },
    );
  }
}
