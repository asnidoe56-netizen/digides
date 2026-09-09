import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth/session";
import { createMyStoreProduct, listMyStoreProducts } from "@/services/store-product.service";

// barcode/categoryId/costPrice are all `.nullable().optional()`: absent
// means "not provided", explicit null means "no barcode / no category / no
// modal". Both are ordinary, expected states — PRD Kasir Pintar §3 keeps
// all three optional because most warung goods have no barcode and plenty
// of owners don't know their modal on day one. The barcode string itself
// is normalised in the service, not here, so every caller (web, Flutter,
// a future import) gets the same treatment.
const createProductSchema = z.object({
  name: z.string().trim().min(1, "Nama produk wajib diisi"),
  price: z.number().int().positive(),
  stock: z.number().int().min(0),
  barcode: z.string().nullable().optional(),
  categoryId: z.string().uuid().nullable().optional(),
  costPrice: z.number().int().min(0).nullable().optional(),
});

// The cashier's product search (§3 MVP) — always the caller's own store,
// resolved server-side, never a client-supplied store id.
export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Tidak diizinkan" }, { status: 403 });
  }

  try {
    const products = await listMyStoreProducts(session.userId);
    return NextResponse.json({ products });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Gagal memuat produk." },
      { status: 400 },
    );
  }
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Tidak diizinkan" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = createProductSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Data tidak valid", issues: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  try {
    const product = await createMyStoreProduct({
      ownerUserId: session.userId,
      name: parsed.data.name,
      price: parsed.data.price,
      stock: parsed.data.stock,
      barcode: parsed.data.barcode,
      categoryId: parsed.data.categoryId,
      costPrice: parsed.data.costPrice,
    });
    return NextResponse.json({ product }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Gagal membuat produk." },
      { status: 400 },
    );
  }
}
