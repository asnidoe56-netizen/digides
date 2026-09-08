import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth/session";
import { confirmStorePayment } from "@/services/store-payment.service";

const confirmSchema = z.object({
  pin: z.string().regex(/^[0-9]{6}$/, "PIN harus 6 digit"),
});

// The buyer's own confirmation (§5 steps 5-7) — always the current
// session's own PIN and own wallet, never a merchant-supplied identity
// (§6 rule 2).
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Tidak diizinkan" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = confirmSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Data tidak valid", issues: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  try {
    const result = await confirmStorePayment({
      paymentRequestId: id,
      buyerUserId: session.userId,
      buyerRoles: session.roles,
      pin: parsed.data.pin,
    });
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Pembayaran gagal diproses.";
    const friendlyMessage = message.startsWith("Insufficient balance")
      ? "Saldo tidak cukup untuk pembayaran ini."
      : message;
    return NextResponse.json({ error: friendlyMessage }, { status: 400 });
  }
}
