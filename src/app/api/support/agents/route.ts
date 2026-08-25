import { NextResponse } from "next/server";
import { supportAgentSchema } from "@/features/support/schemas/support-agent.schema";
import { requireRole } from "@/lib/auth/session";
import { addSupportAgent } from "@/services/support.service";

export async function POST(request: Request) {
  const session = await requireRole("SUPER_ADMIN");
  if (!session) {
    return NextResponse.json({ error: "Tidak diizinkan" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = supportAgentSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Data tidak valid", issues: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  try {
    const agent = await addSupportAgent(
      {
        full_name: parsed.data.full_name,
        email: parsed.data.email,
        phone: parsed.data.phone || null,
        role: parsed.data.role,
      },
      session.userId,
    );
    return NextResponse.json({ agent }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gagal menambahkan agen.";
    return NextResponse.json({ error: message }, { status: message.includes("sudah terdaftar") ? 409 : 400 });
  }
}
