import { NextResponse } from "next/server";
import { categoryMarkupSchema } from "@/features/markup/schemas/category-markup.schema";
import { requireRole } from "@/lib/auth/session";
import { setCategoryMarkup } from "@/services/pricing.service";

// Sets the one MASTER/CATEGORY markup rule for a category — the amount
// every agent's selling price is computed from (base_price + markup).
// SUPER_ADMIN only, same as every other pricing-affecting endpoint.
export async function PATCH(request: Request, { params }: { params: Promise<{ categoryId: string }> }) {
  const session = await requireRole("SUPER_ADMIN");
  if (!session) {
    return NextResponse.json({ error: "Tidak diizinkan" }, { status: 403 });
  }

  const { categoryId } = await params;
  const body = await request.json().catch(() => null);
  const parsed = categoryMarkupSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Data tidak valid", issues: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  try {
    const rule = await setCategoryMarkup({
      categoryId,
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
