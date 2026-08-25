import { NextResponse } from "next/server";
import { brandNameSchema } from "@/features/brand/schemas/brand.schema";
import { requireRole } from "@/lib/auth/session";
import { addBrand } from "@/services/brand.service";

export async function POST(request: Request) {
  const session = await requireRole("SUPER_ADMIN");
  if (!session) {
    return NextResponse.json({ error: "Tidak diizinkan" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = brandNameSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Data tidak valid", issues: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  try {
    const brand = await addBrand(parsed.data.name, session.userId);
    return NextResponse.json({ brand }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gagal membuat brand.";
    return NextResponse.json({ error: message }, { status: message.includes("sudah ada") ? 409 : 400 });
  }
}
