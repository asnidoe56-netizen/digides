import {
  getTransactionPinForVerification,
  incrementPinFailedAttempts,
  lockTransactionPin,
  resetPinFailedAttempts,
} from "@/repositories/user.repository";
import { createSecurityIncident } from "@/repositories/security-incident.repository";
import { getSecurityPolicy } from "@/repositories/security-policy.repository";
import { verifyPin } from "@/lib/auth/pin";

// The one place a transaction PIN gets checked — every purchase confirms
// through here before any wallet reservation happens (transaction.service.ts).
// user_transaction_pins' failed_attempts/locked_until columns existed since
// M02 but had no caller until now. Thresholds come from security_policies
// (Kebijakan Keamanan) instead of being hardcoded, so Super Admin can tune
// them without a code change.
export async function verifyTransactionPin(userId: string, pin: string): Promise<void> {
  const policy = await getSecurityPolicy();
  const record = await getTransactionPinForVerification(userId);
  if (!record) {
    throw new Error("PIN transaksi belum diatur");
  }

  if (record.status === "LOCKED") {
    if (record.locked_until && record.locked_until > new Date()) {
      const minutesLeft = Math.ceil((record.locked_until.getTime() - Date.now()) / 60_000);
      throw new Error(`PIN terkunci karena terlalu banyak percobaan gagal. Coba lagi dalam ${minutesLeft} menit.`);
    }
    // Lock window has passed — let this attempt through; a correct PIN
    // below resets attempts/status, a wrong one re-locks with a fresh window.
    await resetPinFailedAttempts(userId);
  }

  const isValid = await verifyPin(pin, record.pin_hash);
  if (isValid) {
    await resetPinFailedAttempts(userId);
    return;
  }

  const failedAttempts = await incrementPinFailedAttempts(userId);
  if (failedAttempts >= policy.max_pin_attempts) {
    await lockTransactionPin(userId, new Date(Date.now() + policy.pin_lockout_minutes * 60_000));
    await createSecurityIncident({
      type: "PIN_LOCKOUT",
      severity: "MEDIUM",
      user_id: userId,
      description: `PIN transaksi terkunci setelah ${failedAttempts} percobaan gagal beruntun.`,
    });
    throw new Error(`PIN salah. PIN terkunci selama ${policy.pin_lockout_minutes} menit karena terlalu banyak percobaan gagal.`);
  }

  throw new Error(`PIN salah. Sisa percobaan: ${policy.max_pin_attempts - failedAttempts}.`);
}
