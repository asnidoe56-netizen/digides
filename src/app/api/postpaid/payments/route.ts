import { NextResponse } from "next/server";
import { z } from "zod";
import type { AuthenticationResponseJSON } from "@simplewebauthn/server";
import { getSession } from "@/lib/auth/session";
import { payBill } from "@/services/postpaid.service";
import type { TransactionAuth } from "@/services/transaction.service";
import { getWalletForMitraSession } from "@/services/wallet.service";

const mobileBiometricAssertionSchema = z.object({
  credentialId: z.string().min(1),
  challenge: z.string().min(1),
  signature: z.string().min(1),
});

const schema = z
  .object({
    billInquiryId: z.string().uuid(),
    pin: z.string().regex(/^[0-9]{6}$/, "PIN harus 6 digit").optional(),
    biometricAssertion: z.record(z.string(), z.unknown()).optional(),
    mobileBiometricAssertion: mobileBiometricAssertionSchema.optional(),
  })
  .refine(
    (data) =>
      (data.pin ? 1 : 0) + (data.biometricAssertion ? 1 : 0) + (data.mobileBiometricAssertion ? 1 : 0) === 1,
    { message: "Sertakan PIN atau konfirmasi biometrik." },
  );

// Langkah 2: membayar tagihan yang sudah dicek. Tidak ada nominal yang
// dikirim klien — semuanya diambil dari hasil cek tagihan di server, supaya
// mitra membayar persis angka yang tadi tampil di layarnya (§5f batasan 1).
export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Tidak diizinkan" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Data tidak valid", issues: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const wallet = await getWalletForMitraSession(session.userId, session.roles);
  if (!wallet) {
    return NextResponse.json({ error: "Wallet tidak ditemukan untuk akun ini" }, { status: 400 });
  }

  const auth: TransactionAuth = parsed.data.pin
    ? { method: "PIN", pin: parsed.data.pin }
    : parsed.data.mobileBiometricAssertion
      ? { method: "MOBILE_BIOMETRIC", assertion: parsed.data.mobileBiometricAssertion }
      : { method: "BIOMETRIC", assertion: parsed.data.biometricAssertion as unknown as AuthenticationResponseJSON };

  try {
    const transaction = await payBill({
      actorUserId: session.userId,
      walletId: wallet.id,
      billInquiryId: parsed.data.billInquiryId,
      auth,
      channel: "WEB",
    });
    return NextResponse.json({ transaction }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Pembayaran tagihan gagal diproses.";
    const friendly = message.startsWith("Insufficient balance")
      ? "Saldo tidak cukup untuk membayar tagihan ini."
      : message;
    return NextResponse.json({ error: friendly }, { status: 400 });
  }
}
