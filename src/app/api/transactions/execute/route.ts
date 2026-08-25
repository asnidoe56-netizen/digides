import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth/session";
import { executeTransaction } from "@/services/transaction.service";
import { getWalletForMitraSession } from "@/services/wallet.service";

const executeSchema = z.object({
  productId: z.string().uuid(),
  // Not phone-number-shaped for every category — Games' customer_no is a
  // numeric player ID, optionally with a zone ID in parentheses (see
  // CategoryPurchaseFlow's customerIdField). Real format validation for
  // whatever category this product belongs to already happened client-side
  // against that category's own pattern; this is just a sane server-side
  // bound (Digiflazz itself is the actual authority on validity — an
  // unrecognized customer_no comes back as a clear provider error, not a
  // silent failure).
  customerNumber: z
    .string()
    .trim()
    .regex(/^[0-9A-Za-z()]{3,30}$/, "Nomor tujuan/ID tidak valid"),
  pin: z.string().regex(/^[0-9]{6}$/, "PIN harus 6 digit"),
  idempotencyKey: z.string().uuid(),
});

// The buyer-facing counterpart to transaction.service.ts's executeTransaction
// — walletId is always resolved server-side from the caller's own session
// (never trusted from the request body), so this can only ever spend the
// caller's own wallet.
export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Tidak diizinkan" }, { status: 403 });
  }

  const wallet = await getWalletForMitraSession(session.userId, session.roles);
  if (!wallet) {
    return NextResponse.json({ error: "Wallet tidak ditemukan untuk akun ini" }, { status: 400 });
  }

  const body = await request.json().catch(() => null);
  const parsed = executeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Data tidak valid", issues: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  try {
    const transaction = await executeTransaction({
      walletId: wallet.id,
      productId: parsed.data.productId,
      customerNumber: parsed.data.customerNumber,
      pin: parsed.data.pin,
      idempotencyKey: parsed.data.idempotencyKey,
      channel: "WEB",
      actorUserId: session.userId,
    });
    return NextResponse.json({ transaction }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Transaksi gagal diproses.";
    // "Insufficient balance on wallet {uuid} for ..." is an internal
    // message (wallet.repository.ts's postLedgerEntry) never meant for a
    // buyer to see verbatim — every other thrown message here (PIN
    // errors, product/category/brand availability) is already
    // user-facing Indonesian text safe to pass through as-is.
    const friendlyMessage = message.startsWith("Insufficient balance")
      ? "Saldo tidak cukup untuk transaksi ini."
      : message;
    return NextResponse.json({ error: friendlyMessage }, { status: 400 });
  }
}
