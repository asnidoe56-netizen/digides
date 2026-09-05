import { NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/auth/session";
import { setReferralCodeHolderStatus } from "@/services/referral.service";

const holderStatusSchema = z.object({ holderStatus: z.enum(["USER", "MITRA"]) });

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireRole("SUPER_ADMIN");
  if (!session) {
    return NextResponse.json({ error: "Tidak diizinkan" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = holderStatusSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Data tidak valid" }, { status: 400 });
  }

  try {
    const code = await setReferralCodeHolderStatus(id, parsed.data.holderStatus, session.userId);
    return NextResponse.json({ code }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Gagal mengubah status Mitra." },
      { status: 400 },
    );
  }
}
