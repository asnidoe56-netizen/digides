import { NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/auth/session";
import { setCommissionAutoPayout } from "@/services/commission.service";

// No GET handler — the Payout tab is a Server Component that reads
// getCommissionSettings() from commission.service.ts directly, and
// nothing else consumes this resource yet.
const settingsSchema = z.object({
  autoPayoutEnabled: z.boolean(),
  payoutDayOfMonth: z.number().int().min(1).max(28),
});

export async function PATCH(request: Request) {
  const session = await requireRole("SUPER_ADMIN");
  if (!session) {
    return NextResponse.json({ error: "Tidak diizinkan" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = settingsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Data tidak valid" }, { status: 400 });
  }

  try {
    const settings = await setCommissionAutoPayout(
      { autoPayoutEnabled: parsed.data.autoPayoutEnabled, payoutDayOfMonth: parsed.data.payoutDayOfMonth },
      session.userId,
    );
    return NextResponse.json({ settings });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Gagal menyimpan pengaturan." },
      { status: 400 },
    );
  }
}
