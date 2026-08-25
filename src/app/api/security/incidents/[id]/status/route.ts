import { NextResponse } from "next/server";
import { incidentStatusSchema } from "@/features/security/schemas/incident.schema";
import { requireRole } from "@/lib/auth/session";
import { setSecurityIncidentStatusAndAudit } from "@/services/security.service";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireRole("SUPER_ADMIN");
  if (!session) {
    return NextResponse.json({ error: "Tidak diizinkan" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = incidentStatusSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Data tidak valid", issues: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  if (parsed.data.status === "RESOLVED" && !parsed.data.note) {
    return NextResponse.json(
      { error: "Data tidak valid", issues: { note: ["Catatan penyelesaian wajib diisi"] } },
      { status: 400 },
    );
  }

  try {
    const incident = await setSecurityIncidentStatusAndAudit(
      id,
      parsed.data.status,
      parsed.data.note ?? null,
      session.userId,
    );
    return NextResponse.json({ incident }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Gagal mengubah status insiden." },
      { status: 400 },
    );
  }
}
