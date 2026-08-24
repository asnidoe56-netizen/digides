import { NextResponse } from "next/server";
import { digiflazzSettingsServerSchema } from "@/features/digiflazz/schemas/digiflazz-settings.schema";
import { getSession } from "@/lib/auth/session";
import { recordAuditLog } from "@/repositories/audit.repository";
import {
  getDigiflazzSettingsForDisplay,
  saveDigiflazzSettings,
} from "@/services/digiflazz.service";

// Digiflazz credentials are platform-wide and let whoever holds them
// drain the account's balance via real transactions — only SUPER_ADMIN
// may read (even the masked view) or write this endpoint. Every route
// that touches this table must re-check the role itself; a hidden menu
// item is not access control (issue M03 section 22).
async function requireSuperAdmin() {
  const session = await getSession();
  if (!session || !session.roles.includes("SUPER_ADMIN")) {
    return null;
  }
  return session;
}

export async function PUT(request: Request) {
  const session = await requireSuperAdmin();
  if (!session) {
    return NextResponse.json({ error: "Tidak diizinkan" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = digiflazzSettingsServerSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Data tidak valid", issues: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const { username, base_url, mode, dev_key, prod_key } = parsed.data;

  const saved = await saveDigiflazzSettings({
    username,
    base_url,
    mode,
    dev_key: dev_key || undefined,
    prod_key: prod_key || undefined,
  });

  // Never log the key values themselves — only that a change happened and
  // which fields were touched, matching the redaction rule audit.repository
  // enforces for old_value/new_value.
  await recordAuditLog({
    actor_user_id: session.userId,
    action: "DIGIFLAZZ_SETTINGS_UPDATED",
    entity: "digiflazz_settings",
    entity_id: saved.id,
    new_value: {
      username,
      base_url,
      mode,
      dev_key_changed: Boolean(dev_key),
      prod_key_changed: Boolean(prod_key),
    },
  });

  const settings = await getDigiflazzSettingsForDisplay();
  return NextResponse.json(settings);
}
