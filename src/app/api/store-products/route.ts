import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth/session";
import { createMyStoreProduct, listMyStoreProducts } from "@/services/store-product.service";

const createProductSchema = z.object({
  name: z.string().trim().min(1, "Nama produk wajib diisi"),
  price: z.number().int().positive(),
  stock: z.number().int().min(0),
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
    });
    return NextResponse.json({ product }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Gagal membuat produk." },
      { status: 400 },
    );
  }
}
