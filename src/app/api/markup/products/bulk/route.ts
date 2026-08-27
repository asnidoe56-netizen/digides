import { NextResponse } from "next/server";
import { bulkProductMarkupSchema } from "@/features/markup/schemas/product-markup.schema";
import { requireRole } from "@/lib/auth/session";
import { bulkSetProductMarkup } from "@/services/pricing.service";

// "Terapkan ke semua" — sets the same nominal markup for every product
// matching the current category/provider/status/search filter in one
// action, e.g. Kategori "Pulsa" + Provider "TELKOMSEL". SUPER_ADMIN only.
export async function POST(request: Request) {
  const session = await requireRole("SUPER_ADMIN");
  if (!session) {
    return NextResponse.json({ error: "Tidak diizinkan" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = bulkProductMarkupSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Data tidak valid", issues: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  try {
    const result = await bulkSetProductMarkup({
      categoryId: parsed.data.categoryId,
      brandId: parsed.data.brandId,
      status: parsed.data.status,
      search: parsed.data.search,
      markupValue: parsed.data.markupValue,
      actorUserId: session.userId,
    });
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Gagal menerapkan markup massal." },
      { status: 400 },
    );
  }
}
