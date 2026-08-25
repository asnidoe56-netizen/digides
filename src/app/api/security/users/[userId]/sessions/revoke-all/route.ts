import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/session";
import { revokeAllSessionsForUserAndAudit } from "@/services/security.service";

export async function PATCH(request: Request, { params }: { params: Promise<{ userId: string }> }) {
  const session = await requireRole("SUPER_ADMIN");
  if (!session) {
    return NextResponse.json({ error: "Tidak diizinkan" }, { status: 403 });
  }

  const { userId } = await params;

  try {
    const revokedCount = await revokeAllSessionsForUserAndAudit(userId, session.userId);
    return NextResponse.json({ revokedCount }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Gagal mencabut seluruh sesi." },
      { status: 400 },
    );
  }
}
