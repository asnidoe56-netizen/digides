import { NextResponse } from "next/server";
import { assignTicketSchema } from "@/features/support/schemas/ticket.schema";
import { requireRole } from "@/lib/auth/session";
import { assignTicket } from "@/services/support.service";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireRole("SUPER_ADMIN");
  if (!session) {
    return NextResponse.json({ error: "Tidak diizinkan" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = assignTicketSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Data tidak valid", issues: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  try {
    const complaint = await assignTicket(id, parsed.data.agentId, session.userId);
    return NextResponse.json({ complaint }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Gagal menugaskan tiket." },
      { status: 400 },
    );
  }
}
