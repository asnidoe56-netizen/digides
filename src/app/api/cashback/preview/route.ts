import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth/session";
import { previewCashback } from "@/services/cashback.service";

// Peringatan §6.2 yang hidup saat admin mengetik: berapa yang AKAN
// benar-benar terbayar, bukan berapa yang diketik.
//
// Tidak menulis apa pun. Ia hanya menghitung, memakai fungsi yang sama
// persis dengan mesin yang membayar — supaya panel dan kenyataan tidak
// pernah berbeda jawaban.
const previewSchema = z.object({
  productId: z.string().uuid(),
  cashbackType: z.enum(["NOMINAL", "PERCENTAGE"]),
  cashbackValue: z.number().nonnegative(),
  maxCashback: z.number().int().nonnegative().nullish(),
});

export async function POST(request: Request) {
  const session = await getSession();
  if (!session || !session.roles.includes("SUPER_ADMIN")) {
    return NextResponse.json({ error: "Tidak diizinkan" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = previewSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Data tidak valid" }, { status: 400 });
  }

  try {
    const preview = await previewCashback({
      productId: parsed.data.productId,
      cashbackType: parsed.data.cashbackType,
      cashbackValue: parsed.data.cashbackValue,
      maxCashback: parsed.data.maxCashback ?? null,
    });
    return NextResponse.json({ preview });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Gagal menghitung perkiraan." },
      { status: 400 },
    );
  }
}
