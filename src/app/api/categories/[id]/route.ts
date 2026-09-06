import { NextResponse } from "next/server";
import { categoryDisplayNameSchema } from "@/features/category/schemas/category.schema";
import { requireRole } from "@/lib/auth/session";
import { setCategoryDisplayNameAndAudit } from "@/services/category.service";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireRole("SUPER_ADMIN");
  if (!session) {
    return NextResponse.json({ error: "Tidak diizinkan" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = categoryDisplayNameSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Data tidak valid", issues: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  try {
    const category = await setCategoryDisplayNameAndAudit(id, parsed.data.displayName, session.userId);
    return NextResponse.json({ category }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gagal mengubah nama tampilan kategori.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
