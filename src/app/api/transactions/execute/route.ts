import { NextResponse } from "next/server";
import { z } from "zod";
import type { AuthenticationResponseJSON } from "@simplewebauthn/server";
import { getSession } from "@/lib/auth/session";
import { executeTransaction, type TransactionAuth } from "@/services/transaction.service";
import { getWalletForMitraSession } from "@/services/wallet.service";
import { getSpendableStoreWalletForOwner } from "@/services/store.service";

const mobileBiometricAssertionSchema = z.object({
  credentialId: z.string().min(1),
  challenge: z.string().min(1),
  signature: z.string().min(1),
});

const executeSchema = z
  .object({
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
    idempotencyKey: z.string().uuid(),
    // Confirm with exactly one of the three — the web PIN screen's
    // "Gunakan Biometrik" sends biometricAssertion (a WebAuthn response
    // from @simplewebauthn/browser), the Flutter app's equivalent sends
    // mobileBiometricAssertion (a biometric_signature-signed challenge),
    // never more than one together with pin.
    pin: z.string().regex(/^[0-9]{6}$/, "PIN harus 6 digit").optional(),
    biometricAssertion: z.record(z.string(), z.unknown()).optional(),
    mobileBiometricAssertion: mobileBiometricAssertionSchema.optional(),
    // E-Money/Games' "Verifikasi Pengguna"/"Cek Username" result, if the
    // mitra ran one right before submitting — see ExecuteTransactionInput.
    // customerName's doc comment. Purely denormalized display data.
    customerName: z.string().trim().max(255).optional(),
    // Which of the caller's OWN wallets funds this purchase. Absent means
    // PERSONAL, which is byte-for-byte today's behaviour — both existing
    // clients (web and the mitra app) send nothing and are unaffected.
    // "STORE" spends the caller's own store's balance, the one thing a
    // store wallet is allowed to do with its money (PRD Digides Toko §1,
    // §6 rule 9). This is a *source selector*, never a wallet id: the
    // actual wallet is still resolved entirely server-side below.
    payWith: z.enum(["PERSONAL", "STORE"]).optional(),
  })
  .refine(
    (data) =>
      (data.pin ? 1 : 0) + (data.biometricAssertion ? 1 : 0) + (data.mobileBiometricAssertion ? 1 : 0) === 1,
    { message: "Sertakan PIN atau konfirmasi biometrik." },
  );

// The buyer-facing counterpart to transaction.service.ts's executeTransaction
// — walletId is always resolved server-side from the caller's own session
// (never trusted from the request body), so this can only ever spend a
// wallet the caller themselves owns. `payWith` picks WHICH of their own
// wallets (personal by default, or their own store's), and is the only
// influence a client has over that choice; see
// FLOW_KERJA_DAN_BATASAN_KERJA_TRANSAKSI.md §5c.
export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Tidak diizinkan" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = executeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Data tidak valid", issues: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  let wallet;
  if (parsed.data.payWith === "STORE") {
    try {
      wallet = await getSpendableStoreWalletForOwner(session.userId);
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Wallet toko tidak ditemukan" },
        { status: 400 },
      );
    }
  } else {
    wallet = await getWalletForMitraSession(session.userId, session.roles);
  }
  if (!wallet) {
    return NextResponse.json({ error: "Wallet tidak ditemukan untuk akun ini" }, { status: 400 });
  }

  const auth: TransactionAuth = parsed.data.pin
    ? { method: "PIN", pin: parsed.data.pin }
    : parsed.data.mobileBiometricAssertion
      ? { method: "MOBILE_BIOMETRIC", assertion: parsed.data.mobileBiometricAssertion }
      : { method: "BIOMETRIC", assertion: parsed.data.biometricAssertion as unknown as AuthenticationResponseJSON };

  try {
    const transaction = await executeTransaction({
      walletId: wallet.id,
      productId: parsed.data.productId,
      customerNumber: parsed.data.customerNumber,
      auth,
      idempotencyKey: parsed.data.idempotencyKey,
      channel: "WEB",
      actorUserId: session.userId,
      customerName: parsed.data.customerName,
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
