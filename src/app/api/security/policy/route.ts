import { NextResponse } from "next/server";
import { securityPolicySchema } from "@/features/security/schemas/policy.schema";
import { requireRole } from "@/lib/auth/session";
import { updateSecurityPolicyAndAudit } from "@/services/security.service";

export async function PATCH(request: Request) {
  const session = await requireRole("SUPER_ADMIN");
  if (!session) {
    return NextResponse.json({ error: "Tidak diizinkan" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = securityPolicySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Data tidak valid", issues: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  try {
    const policy = await updateSecurityPolicyAndAudit(parsed.data, session.userId);
    return NextResponse.json({ policy }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Gagal menyimpan kebijakan." },
      { status: 400 },
    );
  }
}
