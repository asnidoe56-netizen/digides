import { NextResponse } from "next/server";
import { brandNameSchema } from "@/features/brand/schemas/brand.schema";
import { requireRole } from "@/lib/auth/session";
import { renameBrandAndAudit } from "@/services/brand.service";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireRole("SUPER_ADMIN");
  if (!session) {
    return NextResponse.json({ error: "Tidak diizinkan" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = brandNameSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Data tidak valid", issues: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  try {
    const brand = await renameBrandAndAudit(id, parsed.data.name, session.userId);
    return NextResponse.json({ brand }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gagal mengubah nama brand.";
    return NextResponse.json({ error: message }, { status: message.includes("sudah ada") ? 409 : 400 });
  }
}
