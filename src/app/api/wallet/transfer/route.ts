import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth/session";
import { transferToDownline } from "@/services/wallet.service";

const transferSchema = z.object({
  recipientUserId: z.string().uuid(),
  amount: z.number().int().positive(),
  pin: z.string().regex(/^[0-9]{6}$/, "PIN harus 6 digit"),
});

// Sender is always resolved server-side from the session — the request
// body only ever names the recipient, never the sender's own wallet id.
export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Tidak diizinkan" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = transferSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Data tidak valid", issues: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  try {
    const result = await transferToDownline({
      senderUserId: session.userId,
      senderRoles: session.roles,
      recipientUserId: parsed.data.recipientUserId,
      amount: parsed.data.amount,
      pin: parsed.data.pin,
    });
    return NextResponse.json({ result }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Transfer gagal diproses.";
    // "Insufficient balance on wallet {uuid} for ..." is an internal
    // message (wallet.repository.ts's postLedgerEntry) never meant for a
    // user to see verbatim — same translation as
    // transactions/execute/route.ts.
    const friendlyMessage = message.startsWith("Insufficient balance")
      ? "Saldo tidak cukup untuk transfer ini."
      : message;
    return NextResponse.json({ error: friendlyMessage }, { status: 400 });
  }
}
