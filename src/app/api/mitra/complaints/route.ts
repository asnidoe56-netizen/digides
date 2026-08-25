import { NextResponse } from "next/server";
import { complaintSchema } from "@/features/mitra/schemas/complaint.schema";
import { requireRole } from "@/lib/auth/session";
import { submitMitraComplaint } from "@/services/mitra-complaint.service";

// Called by a Mitra's own login (BUMDES_ADMIN role, created by
// bumdes.service.ts's registerMitra) — no Mitra portal page exists yet to
// put a form in front of this, but the endpoint itself is real and
// already callable by any real Mitra admin account today.
export async function POST(request: Request) {
  const session = await requireRole("BUMDES_ADMIN");
  if (!session) {
    return NextResponse.json({ error: "Tidak diizinkan" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = complaintSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Data tidak valid", issues: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  try {
    const complaint = await submitMitraComplaint({
      actorUserId: session.userId,
      subject: parsed.data.subject,
      message: parsed.data.message,
    });
    return NextResponse.json({ complaint }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Gagal mengirim keluhan." },
      { status: 400 },
    );
  }
}
