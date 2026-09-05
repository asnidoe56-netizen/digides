import {
  findManualPaymentMethodById,
  listActiveManualPaymentMethods,
  listManualPaymentMethods,
  setManualPaymentMethodActive,
  updateManualPaymentMethod,
  type UpdateManualPaymentMethodInput,
} from "@/repositories/manual-payment-method.repository";
import { recordAuditLog } from "@/repositories/audit.repository";

export async function getManualPaymentMethods() {
  return listManualPaymentMethods();
}

export async function getActiveManualPaymentMethods() {
  return listActiveManualPaymentMethods();
}

export async function updateManualPaymentMethodAndAudit(
  id: string,
  input: UpdateManualPaymentMethodInput,
  actorUserId: string,
) {
  const current = await findManualPaymentMethodById(id);
  if (!current) {
    throw new Error("Metode pembayaran tidak ditemukan");
  }

  const updated = await updateManualPaymentMethod(id, input, actorUserId);
  if (!updated) {
    throw new Error("Metode pembayaran tidak ditemukan");
  }

  await recordAuditLog({
    actor_user_id: actorUserId,
    action: "MANUAL_PAYMENT_METHOD_UPDATED",
    entity: "manual_payment_methods",
    entity_id: updated.id,
    old_value: { ...current },
    new_value: { ...updated },
  });

  return updated;
}

export async function setManualPaymentMethodActiveAndAudit(id: string, isActive: boolean, actorUserId: string) {
  const updated = await setManualPaymentMethodActive(id, isActive, actorUserId);
  if (!updated) {
    throw new Error("Metode pembayaran tidak ditemukan");
  }

  await recordAuditLog({
    actor_user_id: actorUserId,
    action: isActive ? "MANUAL_PAYMENT_METHOD_ACTIVATED" : "MANUAL_PAYMENT_METHOD_DEACTIVATED",
    entity: "manual_payment_methods",
    entity_id: updated.id,
  });

  return updated;
}
