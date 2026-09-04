import { getSupportSettings, updateSupportSettings } from "@/repositories/support-settings.repository";
import { recordAuditLog } from "@/repositories/audit.repository";

export async function updateSupportSettingsAndAudit(whatsappNumber: string, actorUserId: string) {
  const current = await getSupportSettings();
  const updated = await updateSupportSettings(current.id, whatsappNumber, actorUserId);

  await recordAuditLog({
    actor_user_id: actorUserId,
    action: "SUPPORT_SETTINGS_UPDATED",
    entity: "support_settings",
    entity_id: updated.id,
    old_value: { whatsapp_number: current.whatsapp_number },
    new_value: { whatsapp_number: updated.whatsapp_number },
  });

  return updated;
}
