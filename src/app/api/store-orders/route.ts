import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth/session";
import { createStoreOrder, listMyStoreOrders } from "@/services/store-payment.service";
import type { StoreOrderStatus } from "@/types/store-order";

const ORDER_STATUSES: StoreOrderStatus[] = ["PENDING", "PAID", "FAILED", "EXPIRED", "CANCELLED"];

// "Riwayat transaksi toko" (PRD §3 MVP) — always scoped to the caller's own
// store, resolved server-side.
export async function GET(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Tidak diizinkan" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const statusParam = searchParams.get("status");
  const status = ORDER_STATUSES.find((candidate) => candidate === statusParam);
  const limit = Math.min(Math.max(Number(searchParams.get("limit")) || 20, 1), 100);
  const page = Math.max(Number(searchParams.get("page")) || 1, 1);

  try {
    const { orders, total } = await listMyStoreOrders(session.userId, {
      status,
      limit,
      offset: (page - 1) * limit,
    });
    return NextResponse.json({ orders, total, page, limit });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Gagal memuat riwayat toko." },
      { status: 400 },
    );
  }
}

const createOrderSchema = z.object({
  items: z
    .array(
      z.object({
        storeProductId: z.string().uuid(),
        quantity: z.number().int().positive(),
      }),
    )
    .min(1, "Keranjang tidak boleh kosong"),
});

// The cashier (always the store owner's own session — no separate kasir
// accounts in the MVP, PRD §3) builds a cart. Never touches any wallet or
// stock — see store-payment.service.ts's createStoreOrder.
export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Tidak diizinkan" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = createOrderSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Data tidak valid", issues: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  try {
    const result = await createStoreOrder({ ownerUserId: session.userId, items: parsed.data.items });
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Gagal membuat pesanan." },
      { status: 400 },
    );
  }
}
