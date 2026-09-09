import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth/session";
import { updateMyStoreProduct } from "@/services/store-product.service";

// Every field optional — this is a partial edit, and the service treats
// "absent" as "leave unchanged". Stock is deliberately NOT editable here:
// it moves only through the event-logged stock endpoint next to this one,
// so store_products.stock can never drift from store_inventory_events.
//
// The three Kasir Pintar fields are `.nullable().optional()` because for
// them "absent" and "null" mean different things: absent leaves the value
// alone, null clears it. An owner who mistyped a barcode, or who no longer
// stands behind a modal figure, must be able to remove it — under the
// COALESCE this route used before, those fields would have been
// write-once with no error explaining why.
const updateProductSchema = z
  .object({
    name: z.string().trim().min(1, "Nama produk wajib diisi").optional(),
    price: z.number().int().positive().optional(),
    isActive: z.boolean().optional(),
    barcode: z.string().nullable().optional(),
    categoryId: z.string().uuid().nullable().optional(),
    costPrice: z.number().int().min(0).nullable().optional(),
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
    // Spread rather than naming each field: `parsed.data` only carries the
    // keys the client actually sent, so an omitted barcode stays omitted
    // instead of being flattened to undefined-vs-null ambiguity here.
    const product = await updateMyStoreProduct({
      ownerUserId: session.userId,
      productId: id,
      ...parsed.data,
    });
    return NextResponse.json({ product });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Gagal memperbarui produk." },
      { status: 400 },
    );
  }
}
