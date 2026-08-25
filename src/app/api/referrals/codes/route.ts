import { NextResponse } from "next/server";
import { generateReferralCodeSchema } from "@/features/referral/schemas/referral.schema";
import { requireRole } from "@/lib/auth/session";
import { generateReferralCode } from "@/services/referral.service";

export async function POST(request: Request) {
  const session = await requireRole("SUPER_ADMIN");
  if (!session) {
    return NextResponse.json({ error: "Tidak diizinkan" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = generateReferralCodeSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Data tidak valid", issues: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  try {
    const code = await generateReferralCode({
      userId: parsed.data.userId,
      customCode: parsed.data.customCode || null,
      actorUserId: session.userId,
    });
    return NextResponse.json({ code }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Gagal membuat kode referral." },
      { status: 400 },
    );
  }
}
