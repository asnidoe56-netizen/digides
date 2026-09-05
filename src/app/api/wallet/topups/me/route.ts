import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth/session";
import { createMyTopupRequest } from "@/services/wallet-topup.service";

const mySchema = z.object({
  amount: z.number({ message: "Nominal wajib diisi" }).positive("Nominal harus lebih besar dari nol"),
  manualChannel: z.enum(["DANA", "TRANSFER_BANK"]),
});

// The Mitra app's own "Isi Saldo" — resolves the wallet from the caller's
// own session (never a client-supplied walletId), unlike the SUPER_ADMIN-
// only POST /api/wallet/topups above which records a request on someone
// else's behalf.
export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Tidak diizinkan" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = mySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Data tidak valid", issues: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  try {
    const payment = await createMyTopupRequest(
      session.userId,
      session.roles,
      parsed.data.amount,
      parsed.data.manualChannel,
    );
    return NextResponse.json({ payment }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Gagal membuat permintaan top up." },
      { status: 400 },
    );
  }
}
