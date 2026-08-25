import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/session";
import { settlePendingCommissions } from "@/services/commission.service";

// "Proses Komisi Tertunda" on the Ledger tab — moves PENDING entries whose
// holding period has passed to AVAILABLE. No cron/job runner exists yet,
// so this is a manual admin trigger.
export async function POST() {
  const session = await requireRole("SUPER_ADMIN");
  if (!session) {
    return NextResponse.json({ error: "Tidak diizinkan" }, { status: 403 });
  }

  try {
    const settledCount = await settlePendingCommissions(session.userId);
    return NextResponse.json({ settledCount }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Gagal memproses komisi tertunda." },
      { status: 400 },
    );
  }
}
