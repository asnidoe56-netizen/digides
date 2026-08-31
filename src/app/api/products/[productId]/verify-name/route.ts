import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth/session";
import { verifyCustomerName } from "@/services/verification.service";

const verifyNameSchema = z.object({
  customerNumber: z
    .string()
    .trim()
    .regex(/^[0-9A-Za-z()]{3,30}$/, "Nomor tujuan tidak valid"),
});

// E-Money's "Verifikasi Pengguna" button — a free Digiflazz "Cek Nama
// Pengguna <Brand>" lookup (see verification.service.ts), never a
// purchase: no PIN, no wallet reservation. Any logged-in mitra session
// can call this, same "read-only, session is enough" reasoning as
// live-price.
export async function POST(request: Request, { params }: { params: Promise<{ productId: string }> }) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Tidak diizinkan" }, { status: 403 });
  }

  const { productId } = await params;

  const body = await request.json().catch(() => null);
  const parsed = verifyNameSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Data tidak valid", issues: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  try {
    const result = await verifyCustomerName(productId, parsed.data.customerNumber, session.userId);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Gagal memverifikasi nomor." },
      { status: 400 },
    );
  }
}
