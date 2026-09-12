import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth/session";
import { inquireBill } from "@/services/postpaid.service";
import { getWalletForMitraSession } from "@/services/wallet.service";

const schema = z.object({
  productId: z.string().uuid(),
  // Nomor pelanggan tunggal. PBB dan SAMSAT memakai inputParts, dan server
  // yang menggabungkannya berkoma — klien tidak pernah menyusun format itu.
  customerNo: z
    .string()
    .trim()
    .regex(/^[0-9A-Za-z.-]{3,32}$/, "Nomor pelanggan tidak valid")
    .optional(),
  inputParts: z
    .object({
      kode_bayar: z.string().trim().min(1).max(32).optional(),
      nomor_identitas: z.string().trim().min(1).max(32).optional(),
    })
    .optional(),
  year: z.string().trim().regex(/^[0-9]{4}$/).optional(),
  amount: z.number().int().positive().optional(),
});

// Langkah 1 pembayaran tagihan. Tidak menahan saldo dan tidak membuat
// transaksi — lihat PRD Pascabayar §7.1 dan dokumen terkunci §5f.
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

  try {
    const inquiry = await inquireBill({
      actorUserId: session.userId,
      walletId: wallet.id,
      productId: parsed.data.productId,
      customerNo: parsed.data.customerNo,
      inputParts: parsed.data.inputParts,
      year: parsed.data.year,
      amount: parsed.data.amount,
    });
    return NextResponse.json({ inquiry }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Gagal cek tagihan." },
      { status: 400 },
    );
  }
}
