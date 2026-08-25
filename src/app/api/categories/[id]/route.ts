import { NextResponse } from "next/server";
import { categoryNameSchema } from "@/features/category/schemas/category.schema";
import { requireRole } from "@/lib/auth/session";
import { renameCategoryAndAudit } from "@/services/category.service";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireRole("SUPER_ADMIN");
  if (!session) {
    return NextResponse.json({ error: "Tidak diizinkan" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = categoryNameSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Data tidak valid", issues: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  try {
    const category = await renameCategoryAndAudit(id, parsed.data.name, session.userId);
    return NextResponse.json({ category }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gagal mengubah nama kategori.";
    return NextResponse.json({ error: message }, { status: message.includes("sudah ada") ? 409 : 400 });
  }
}
