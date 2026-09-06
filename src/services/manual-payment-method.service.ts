import {
  createManualPaymentMethod,
  findManualPaymentMethodById,
  listActiveManualPaymentMethods,
  listManualPaymentMethods,
  setManualPaymentMethodActive,
  updateManualPaymentMethod,
  type CreateManualPaymentMethodInput,
  type UpdateManualPaymentMethodInput,
} from "@/repositories/manual-payment-method.repository";
import { recordAuditLog } from "@/repositories/audit.repository";

export async function getManualPaymentMethods() {
  return listManualPaymentMethods();
}

export async function getActiveManualPaymentMethods() {
  return listActiveManualPaymentMethods();
}

// "Tambah Metode" — a brand new bank/e-wallet that isn't one of the
// pre-seeded DANA/GoPay/Mandiri/BRI/BCA rows. Starts inactive so Super
// Admin confirms the real account number/name look right (via "Ubah")
// before flipping it on for Mitra to see.
export async function createManualPaymentMethodAndAudit(input: CreateManualPaymentMethodInput, actorUserId: string) {
  const code = input.code.trim().toUpperCase().replace(/[^A-Z0-9_]/g, "");
  if (!code) {
    throw new Error("Kode metode tidak valid");
  }

  let created;
  try {
    created = await createManualPaymentMethod({ ...input, code }, actorUserId);
  } catch (error) {
    if (error instanceof Error && "code" in error && (error as { code?: string }).code === "23505") {
      throw new Error(`Kode "${code}" sudah dipakai metode lain`);
    }
    throw error;
  }

  await recordAuditLog({
    actor_user_id: actorUserId,
    action: "MANUAL_PAYMENT_METHOD_CREATED",
    entity: "manual_payment_methods",
    entity_id: created.id,
    new_value: { ...created },
  });

  return created;
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
