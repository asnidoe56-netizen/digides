import { NextResponse } from "next/server";
import { midtransSettingsServerSchema } from "@/features/midtrans/schemas/midtrans-settings.schema";
import { requireRole } from "@/lib/auth/session";
import { recordAuditLog } from "@/repositories/audit.repository";
import { getMidtransSettingsForDisplay, saveMidtransSettings } from "@/services/midtrans.service";

// Same access rule as /api/digiflazz/settings — these credentials can
// create real payment transactions and must verify webhook signatures
// correctly, so only SUPER_ADMIN may read (even the masked view) or write.
export async function PUT(request: Request) {
  const session = await requireRole("SUPER_ADMIN");
  if (!session) {
    return NextResponse.json({ error: "Tidak diizinkan" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = midtransSettingsServerSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Data tidak valid", issues: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const { mode, merchant_id, sandbox_server_key, sandbox_client_key, production_server_key, production_client_key } =
    parsed.data;

  const saved = await saveMidtransSettings({
    mode,
    merchant_id,
    sandbox_server_key: sandbox_server_key || undefined,
    sandbox_client_key: sandbox_client_key || undefined,
    production_server_key: production_server_key || undefined,
    production_client_key: production_client_key || undefined,
  });

  // Never log the key values themselves — only that a change happened,
  // matching the redaction rule audit.repository enforces.
  await recordAuditLog({
    actor_user_id: session.userId,
    action: "MIDTRANS_SETTINGS_UPDATED",
    entity: "midtrans_settings",
    entity_id: saved.id,
    new_value: {
      mode,
      merchant_id,
      sandbox_server_key_changed: Boolean(sandbox_server_key),
      sandbox_client_key_changed: Boolean(sandbox_client_key),
      production_server_key_changed: Boolean(production_server_key),
      production_client_key_changed: Boolean(production_client_key),
    },
  });

  const settings = await getMidtransSettingsForDisplay();
  return NextResponse.json(settings);
}
