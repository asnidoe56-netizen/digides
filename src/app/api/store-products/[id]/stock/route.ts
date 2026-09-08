import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth/session";
import { adjustMyStoreProductStock } from "@/services/store-product.service";

// Signed delta rather than an absolute "set stock to N": every movement is
// recorded as an event (store_inventory_events), and an absolute set would
// silently paper over whatever the difference was. Positive restocks,
// negative corrects shrinkage — same shape as a wallet ADJUSTMENT.
const stockSchema = z.object({
  delta: z.number().int().refine((value) => value !== 0, { message: "Perubahan stok tidak boleh nol" }),
});

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Tidak diizinkan" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = stockSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Data tidak valid", issues: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  try {
    const product = await adjustMyStoreProductStock({
      ownerUserId: session.userId,
      productId: id,
      delta: parsed.data.delta,
    });
    return NextResponse.json({ product });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Gagal memperbarui stok." },
      { status: 400 },
    );
  }
}
