import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/session";
import { verifyStore } from "@/services/store.service";

// Super Admin verifies a SUBMITTED store into ACTIVE — same role gate as
// the other one-way admin approvals in this codebase (e.g. manual payment
// method activation).
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireRole("SUPER_ADMIN");
  if (!session) {
    return NextResponse.json({ error: "Tidak diizinkan" }, { status: 403 });
  }

  const { id } = await params;

  try {
    const store = await verifyStore(id, session.userId);
    return NextResponse.json({ store });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Gagal memverifikasi toko." },
      { status: 400 },
    );
  }
}
