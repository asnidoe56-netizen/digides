import { NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/auth/session";
import { runReconciliation } from "@/services/reconciliation.service";

const runSchema = z.object({
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
});

export async function POST(request: Request) {
  const session = await requireRole("SUPER_ADMIN");
  if (!session) {
    return NextResponse.json({ error: "Tidak diizinkan" }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const parsed = runSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Data tidak valid" }, { status: 400 });
  }

  try {
    const result = await runReconciliation({
      dateFrom: parsed.data.dateFrom ? new Date(parsed.data.dateFrom) : undefined,
      dateTo: parsed.data.dateTo ? new Date(`${parsed.data.dateTo}T23:59:59.999`) : undefined,
      actorUserId: session.userId,
    });
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Gagal menjalankan rekonsiliasi." },
      { status: 400 },
    );
  }
}
