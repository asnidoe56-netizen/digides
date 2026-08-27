import { NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/auth/session";
import { setProductAvailability } from "@/services/product.service";

const availabilitySchema = z.object({ disabled: z.boolean() });

// Super Admin's own on/off switch for one product — independent of
// Digiflazz's status. See product.service.ts's setProductAvailability for
// what this actually blocks.
export async function PATCH(request: Request, { params }: { params: Promise<{ productId: string }> }) {
  const session = await requireRole("SUPER_ADMIN");
  if (!session) {
    return NextResponse.json({ error: "Tidak diizinkan" }, { status: 403 });
  }

  const { productId } = await params;
  const body = await request.json().catch(() => null);
  const parsed = availabilitySchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Data tidak valid" }, { status: 400 });
  }

  try {
    const product = await setProductAvailability(productId, parsed.data.disabled, session.userId);
    return NextResponse.json({ product }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Gagal mengubah status produk." },
      { status: 400 },
    );
  }
}
