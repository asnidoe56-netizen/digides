import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/session";
import { runMonthlyCommissionPayout } from "@/services/commission.service";

// "Proses Bulan Ini" on the Payout tab — the same settle+payout cycle the
// unattended monthly job runs (src/jobs/monthly-commission-payout.ts),
// just triggered by an explicit admin click instead of the schedule. Used
// when auto-payout is turned off, or to run an extra cycle on demand.
export async function POST() {
  const session = await requireRole("SUPER_ADMIN");
  if (!session) {
    return NextResponse.json({ error: "Tidak diizinkan" }, { status: 403 });
  }

  const summary = await runMonthlyCommissionPayout(session.userId);
  return NextResponse.json(summary);
}
