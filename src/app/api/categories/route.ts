import { NextResponse } from "next/server";
import { categoryNameSchema } from "@/features/category/schemas/category.schema";
import { getSession, requireRole } from "@/lib/auth/session";
import { addCategory } from "@/services/category.service";
import { listCategories } from "@/repositories/product.repository";

// The Konter/BUMDes home screen's category grid (mobile app + web) — any
// logged-in session can read the catalog's category list, same as the
// Beranda server component's own listCategories() call.
export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Tidak diizinkan" }, { status: 403 });
  }

  const categories = await listCategories();
  return NextResponse.json({ categories });
}

export async function POST(request: Request) {
  const session = await requireRole("SUPER_ADMIN");
  if (!session) {
    return NextResponse.json({ error: "Tidak diizinkan" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = categoryNameSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Data tidak valid", issues: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  try {
    const category = await addCategory(parsed.data.name, session.userId);
    return NextResponse.json({ category }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gagal membuat kategori.";
    return NextResponse.json({ error: message }, { status: message.includes("sudah ada") ? 409 : 400 });
  }
}
