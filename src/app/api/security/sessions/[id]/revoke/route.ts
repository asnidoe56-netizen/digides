import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/session";
import { revokeSessionAndAudit } from "@/services/security.service";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireRole("SUPER_ADMIN");
  if (!session) {
    return NextResponse.json({ error: "Tidak diizinkan" }, { status: 403 });
  }

  const { id } = await params;

  try {
    const revoked = await revokeSessionAndAudit(id, session.userId);
    return NextResponse.json({ session: revoked }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Gagal mencabut sesi." },
      { status: 400 },
    );
  }
}
