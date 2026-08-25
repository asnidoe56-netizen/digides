import { NextResponse } from "next/server";
import { z } from "zod";
import { topupRejectSchema } from "@/features/wallet/schemas/topup.schema";
import { requireRole } from "@/lib/auth/session";
import { approveTopup, rejectTopup } from "@/services/wallet-topup.service";

const actionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("APPROVE") }),
  z.object({ action: z.literal("REJECT"), reason: topupRejectSchema.shape.reason }),
]);

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireRole("SUPER_ADMIN");
  if (!session) {
    return NextResponse.json({ error: "Tidak diizinkan" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = actionSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Data tidak valid" }, { status: 400 });
  }

  try {
    if (parsed.data.action === "APPROVE") {
      const result = await approveTopup(id, session.userId);
      return NextResponse.json(result);
    }

    const payment = await rejectTopup(id, session.userId, parsed.data.reason);
    return NextResponse.json(payment);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Gagal memproses top up." },
      { status: 400 },
    );
  }
}
