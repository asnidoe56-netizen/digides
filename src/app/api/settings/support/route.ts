import { NextResponse } from "next/server";
import { getSession, requireRole } from "@/lib/auth/session";
import { getSupportSettings } from "@/repositories/support-settings.repository";
import { updateSupportSettingsAndAudit } from "@/services/support-settings.service";
import {
  normalizeWhatsappNumber,
  supportSettingsFormSchema,
} from "@/features/support-settings/schemas/support-settings.schema";

// Any authenticated role can read this — it's what the "?" help button
// (Beranda, Flutter mitra app) fetches to build its wa.me link, same
// "any logged-in role" rule as /api/notifications/unread-count.
export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Tidak diizinkan" }, { status: 403 });
  }

  const settings = await getSupportSettings();
  return NextResponse.json({ whatsapp_number: settings.whatsapp_number });
}

export async function PATCH(request: Request) {
  const session = await requireRole("SUPER_ADMIN");
  if (!session) {
    return NextResponse.json({ error: "Tidak diizinkan" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = supportSettingsFormSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Data tidak valid", issues: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const normalized = normalizeWhatsappNumber(parsed.data.whatsapp_number);
  if (!normalized) {
    return NextResponse.json(
      { error: "Nomor WhatsApp tidak valid", issues: { whatsapp_number: ["Nomor WhatsApp tidak valid"] } },
      { status: 400 },
    );
  }

  const updated = await updateSupportSettingsAndAudit(normalized, session.userId);
  return NextResponse.json({ whatsapp_number: updated.whatsapp_number });
}
