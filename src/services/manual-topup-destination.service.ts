import {
  getManualTopupDestination,
  updateManualTopupDestination,
  type UpdateManualTopupDestinationInput,
} from "@/repositories/manual-topup-destination.repository";
import { recordAuditLog } from "@/repositories/audit.repository";

export async function getMyTopupDestination() {
  return getManualTopupDestination();
}

export async function updateManualTopupDestinationAndAudit(
  input: UpdateManualTopupDestinationInput,
  actorUserId: string,
) {
  const current = await getManualTopupDestination();
  const updated = await updateManualTopupDestination(current.id, input, actorUserId);

  await recordAuditLog({
    actor_user_id: actorUserId,
    action: "MANUAL_TOPUP_DESTINATION_UPDATED",
    entity: "manual_topup_destinations",
    entity_id: updated.id,
    old_value: { ...current },
    new_value: { ...updated },
  });

  return updated;
}
