import { NextResponse } from "next/server";
import { sendTopupSchema } from "@/features/mitra/schemas/send-topup.schema";
import { requireRole } from "@/lib/auth/session";
import { sendTopupToMitra } from "@/services/wallet-topup.service";

// Direct "Kirim Saldo" from the Mitra list — see
// wallet-topup.service.ts's sendTopupToMitra for how this differs from
// the request/approve flow on the Wallet menu's Top Up tab.
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireRole("SUPER_ADMIN");
  if (!session) {
    return NextResponse.json({ error: "Tidak diizinkan" }, { status: 403 });
  }

  const { id: bumdesId } = await params;
  const body = await request.json().catch(() => null);
  const parsed = sendTopupSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Data tidak valid", issues: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  try {
    const result = await sendTopupToMitra({
      bumdesId,
      amount: parsed.data.amount,
      actorUserId: session.userId,
    });
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Gagal mengirim saldo." },
      { status: 400 },
    );
  }
}
