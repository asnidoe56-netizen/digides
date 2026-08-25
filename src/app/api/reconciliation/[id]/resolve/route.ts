import { NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/auth/session";
import { resolveReconciliationRecord } from "@/services/reconciliation.service";

const resolveSchema = z.object({
  note: z.string().trim().min(3, "Catatan minimal 3 karakter").max(500),
});

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireRole("SUPER_ADMIN");
  if (!session) {
    return NextResponse.json({ error: "Tidak diizinkan" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = resolveSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Data tidak valid", issues: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  try {
    const record = await resolveReconciliationRecord(id, parsed.data.note, session.userId);
    return NextResponse.json({ record }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Gagal menyelesaikan catatan rekonsiliasi." },
      { status: 400 },
    );
  }
}
