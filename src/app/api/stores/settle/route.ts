import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth/session";
import { settleStoreBalance } from "@/services/store.service";

const settleSchema = z.object({
  amount: z.number().int().positive(),
  pin: z.string().regex(/^[0-9]{6}$/, "PIN harus 6 digit"),
  idempotencyKey: z.string().uuid(),
});

// "Pindahkan ke Saldo Utama" — the store's owner moving their own store
// balance into their own main wallet. Both wallets are resolved entirely
// server-side from the session, so this can only ever move money between
// two wallets the caller already owns: it is not a withdrawal, and not a
// transfer to another user.
export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Tidak diizinkan" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = settleSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Data tidak valid", issues: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  try {
    const result = await settleStoreBalance({
      ownerUserId: session.userId,
      ownerRoles: session.roles,
      amount: parsed.data.amount,
      pin: parsed.data.pin,
      idempotencyKey: parsed.data.idempotencyKey,
    });
    return NextResponse.json({ result }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gagal memindahkan saldo.";
    // postLedgerEntry's internal wording is never meant for a merchant to
    // read verbatim — same translation the purchase and transfer routes do.
    const friendlyMessage = message.startsWith("Insufficient balance")
      ? "Saldo toko tidak cukup untuk pemindahan ini."
      : message;
    return NextResponse.json({ error: friendlyMessage }, { status: 400 });
  }
}
