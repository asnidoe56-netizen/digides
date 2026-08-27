import { NextResponse } from "next/server";
import { productMarkupSchema } from "@/features/markup/schemas/product-markup.schema";
import { requireRole } from "@/lib/auth/session";
import { setProductMarkup } from "@/services/pricing.service";

// Sets the one MASTER/PRODUCT markup rule for a single product — takes
// priority over that product's brand/category/global markup from then on
// (see pricing.service.ts's getEffectiveMarkupValue). SUPER_ADMIN only,
// same as every other pricing-affecting endpoint.
export async function PATCH(request: Request, { params }: { params: Promise<{ productId: string }> }) {
  const session = await requireRole("SUPER_ADMIN");
  if (!session) {
    return NextResponse.json({ error: "Tidak diizinkan" }, { status: 403 });
  }

  const { productId } = await params;
  const body = await request.json().catch(() => null);
  const parsed = productMarkupSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Data tidak valid", issues: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  try {
    const rule = await setProductMarkup({
      productId,
      markupValue: parsed.data.markupValue,
      actorUserId: session.userId,
    });
    return NextResponse.json({ rule }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Gagal menyimpan markup." },
      { status: 400 },
    );
  }
}
