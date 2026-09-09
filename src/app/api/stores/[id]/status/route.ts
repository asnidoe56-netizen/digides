import { NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/auth/session";
import { setStoreSuspension } from "@/services/store.service";

const statusSchema = z.object({ suspend: z.boolean() });

// Super Admin only: stop a store trading, or let it trade again. Suspending
// blocks creating an order and settling balance out (both require an ACTIVE
// store) without touching the balance already in the store's wallet — the
// owner keeps full read access to their own history either way.
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireRole("SUPER_ADMIN");
  if (!session) {
    return NextResponse.json({ error: "Tidak diizinkan" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = statusSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Data tidak valid" }, { status: 400 });
  }

  try {
    const store = await setStoreSuspension(id, parsed.data.suspend, session.userId);
    return NextResponse.json({ store });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Gagal mengubah status toko." },
      { status: 400 },
    );
  }
}
