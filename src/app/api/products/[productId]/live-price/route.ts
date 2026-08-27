import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getLiveProductPricing } from "@/services/pricing.service";

// Called right when a mitra taps "Lanjutkan" after picking a nominal — a
// single buyer_sku_code lookup against Digiflazz (see pricing.service.ts's
// getLiveProductPricing), not the cached local snapshot, so the price on
// the confirmation screen is never more than a few seconds stale. Any
// logged-in mitra session can call this; it's a read-only price check, not
// a money-moving action, so no role gate beyond "has a session" is needed.
export async function POST(request: Request, { params }: { params: Promise<{ productId: string }> }) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Tidak diizinkan" }, { status: 403 });
  }

  const { productId } = await params;

  try {
    const pricing = await getLiveProductPricing(productId);
    return NextResponse.json(pricing);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Gagal memeriksa harga terbaru." },
      { status: 400 },
    );
  }
}
