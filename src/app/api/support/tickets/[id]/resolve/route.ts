import { NextResponse } from "next/server";
import { resolveTicketSchema } from "@/features/support/schemas/ticket.schema";
import { requireRole } from "@/lib/auth/session";
import { resolveTicket } from "@/services/support.service";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireRole("SUPER_ADMIN");
  if (!session) {
    return NextResponse.json({ error: "Tidak diizinkan" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = resolveTicketSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Data tidak valid", issues: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  try {
    const complaint = await resolveTicket(id, parsed.data.note, session.userId);
    return NextResponse.json({ complaint }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Gagal menyelesaikan tiket." },
      { status: 400 },
    );
  }
}
