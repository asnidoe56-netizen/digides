import { NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/auth/session";
import { setProductTag } from "@/services/product.service";

const tagSchema = z.object({ tag: z.enum(["SUPER_MURAH", "PROMO", "TERLARIS"]).nullable() });

// Purely a storefront label — no bearing on purchasability.
export async function PATCH(request: Request, { params }: { params: Promise<{ productId: string }> }) {
  const session = await requireRole("SUPER_ADMIN");
  if (!session) {
    return NextResponse.json({ error: "Tidak diizinkan" }, { status: 403 });
  }

  const { productId } = await params;
  const body = await request.json().catch(() => null);
  const parsed = tagSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Data tidak valid" }, { status: 400 });
  }

  try {
    const product = await setProductTag(productId, parsed.data.tag, session.userId);
    return NextResponse.json({ product }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Gagal mengubah label produk." },
      { status: 400 },
    );
  }
}
