import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth/session";
import { updateMyStoreProduct } from "@/services/store-product.service";

// Every field optional — this is a partial edit, and the service treats
// "absent" as "leave unchanged" (COALESCE in the UPDATE). Stock is
// deliberately NOT editable here: it moves only through the event-logged
// stock endpoint next to this one, so store_products.stock can never drift
// from store_inventory_events.
const updateProductSchema = z
  .object({
    name: z.string().trim().min(1, "Nama produk wajib diisi").optional(),
    price: z.number().int().positive().optional(),
    isActive: z.boolean().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, { message: "Tidak ada perubahan yang dikirim" });

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Tidak diizinkan" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = updateProductSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Data tidak valid", issues: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  try {
    const product = await updateMyStoreProduct({
      ownerUserId: session.userId,
      productId: id,
      name: parsed.data.name,
      price: parsed.data.price,
      isActive: parsed.data.isActive,
    });
    return NextResponse.json({ product });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Gagal memperbarui produk." },
      { status: 400 },
    );
  }
}
