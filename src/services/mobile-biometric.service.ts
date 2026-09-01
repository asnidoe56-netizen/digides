import { randomBytes, createVerify } from "crypto";
import {
  createMobileBiometricCredential,
  findMobileBiometricCredential,
  findLoginMobileBiometricCredential,
  listActiveMobileBiometricCredentials,
  listMobileBiometricCredentialSummaries,
  revokeMobileBiometricCredential,
  touchMobileBiometricCredentialUsage,
} from "@/repositories/mobile-biometric-credential.repository";
import { createWebauthnChallenge, consumeWebauthnChallenge } from "@/repositories/webauthn-challenge.repository";
import type {
  MobileBiometricCredential,
  MobileBiometricCredentialSummary,
  MobileBiometricAlgorithm,
  MobileBiometricPlatform,
  MobileBiometricPurpose,
} from "@/types/mobile-biometric";

export interface RegisterMobileBiometricInput {
  credentialId: string;
  publicKey: string;
  algorithm: MobileBiometricAlgorithm;
  platform: MobileBiometricPlatform;
  purpose: MobileBiometricPurpose;
  deviceLabel: string;
}

export async function listMyMobileBiometricCredentials(userId: string): Promise<MobileBiometricCredentialSummary[]> {
  return listMobileBiometricCredentialSummaries(userId);
}

// Akun > Keamanan's "Daftarkan Perangkat Ini" (TRANSACTION) and the login
// screen's "Aktifkan Login Biometrik" (LOGIN) on Flutter both call this —
// unlike WebAuthn registration, there is no attestation ceremony to
// verify here: the device already generated the key pair biometric-gated
// in secure hardware (biometric_signature's createKeys()) before this is
// ever called, and this endpoint's only job is to record the resulting
// public key against the session's own account and device.
export async function registerMobileBiometricCredential(
  userId: string,
  deviceId: string | null,
  input: RegisterMobileBiometricInput,
): Promise<MobileBiometricCredentialSummary> {
  const row = await createMobileBiometricCredential({
    user_id: userId,
    credential_id: input.credentialId,
    public_key: input.publicKey,
    algorithm: input.algorithm,
    platform: input.platform,
    purpose: input.purpose,
    device_id: deviceId,
    device_label: input.deviceLabel,
  });

  return {
    id: row.id,
    credential_id: row.credential_id,
    platform: row.platform,
    purpose: row.purpose,
    device_label: row.device_label,
    created_at: row.created_at,
    last_used_at: row.last_used_at,
  };
}

export async function revokeMyMobileBiometricCredential(userId: string, rowId: string): Promise<void> {
  const revoked = await revokeMobileBiometricCredential(rowId, userId);
  if (!revoked) {
    throw new Error("Kredensial biometrik tidak ditemukan");
  }
}

// A transaction's "Gunakan Biometrik" on Flutter — step 1. Same
// requirement as the web path: the account must actually have an active
// TRANSACTION credential, otherwise the app would show a button that can
// only fail. A LOGIN-only credential must never satisfy this check — the
// two purposes are kept strictly separate everywhere they're queried.
export async function getMobileBiometricTransactionChallenge(userId: string): Promise<{ challenge: string }> {
  const credentials = await listActiveMobileBiometricCredentials(userId, "TRANSACTION");
  if (credentials.length === 0) {
    throw new Error("Belum ada perangkat biometrik yang terdaftar.");
  }

  const challenge = randomBytes(32).toString("base64");
  await createWebauthnChallenge(userId, challenge, "TRANSACTION");
  return { challenge };
}

export interface MobileBiometricAssertion {
  credentialId: string;
  challenge: string;
  signature: string;
}

// Shared by both purposes — the exact same RSA/SHA256 verification either
// way, over whichever challenge/signature pair the caller already
// resolved a credential for. Never exported: every caller goes through
// verifyMobileBiometricTransaction or verifyMobileBiometricLogin, which
// each apply their own purpose/ownership/challenge-scoping rules first.
function verifySignature(credential: MobileBiometricCredential, challenge: string, signature: string): boolean {
  const verify = createVerify("SHA256");
  verify.update(Buffer.from(challenge, "base64"));
  verify.end();

  try {
    return verify.verify(credential.public_key, Buffer.from(signature, "base64"));
  } catch {
    return false;
  }
}

// The mobile counterpart to biometric.service.ts's verifyTransactionBiometric
// (WebAuthn) — called from transaction.service.ts's executeTransaction in
// place of a PIN check when the Flutter app confirmed with its
// biometric_signature key instead. Throws the same way a wrong/expired PIN
// attempt does, on any failure.
export async function verifyMobileBiometricTransaction(userId: string, assertion: MobileBiometricAssertion): Promise<void> {
  const consumed = await consumeWebauthnChallenge(userId, assertion.challenge, "TRANSACTION");
  if (!consumed) {
    throw new Error("Verifikasi biometrik gagal. Gunakan PIN sebagai gantinya.");
  }

  const credential = await findMobileBiometricCredential(userId, assertion.credentialId);
  if (!credential || credential.purpose !== "TRANSACTION") {
    throw new Error("Kredensial biometrik tidak dikenali.");
  }

  if (!verifySignature(credential, assertion.challenge, assertion.signature)) {
    throw new Error("Verifikasi biometrik gagal. Gunakan PIN sebagai gantinya.");
  }

  await touchMobileBiometricCredentialUsage(credential.id);
}

// --- Biometric LOGIN (no session yet) -----------------------------------
// Step 1 of the Flutter login screen's "Masuk dengan Sidik Jari": resolve
// which account this device's stored credentialId belongs to (there is no
// session to read a userId from — that's the whole point) and hand back a
// fresh challenge scoped to that account.
export async function getLoginBiometricChallenge(credentialId: string): Promise<{ challenge: string }> {
  const credential = await findLoginMobileBiometricCredential(credentialId);
  if (!credential) {
    throw new Error("Kredensial biometrik tidak dikenali. Silakan gunakan password.");
  }

  const challenge = randomBytes(32).toString("base64");
  await createWebauthnChallenge(credential.user_id, challenge, "LOGIN");
  return { challenge };
}

export interface MobileBiometricLoginResult {
  userId: string;
  /** Always present for a valid LOGIN credential (captured at
   *  registration) — the route refuses to issue a session without one
   *  rather than create a session with no device binding at all. */
  deviceId: string | null;
}

// Step 2 — verifies the signed challenge and identifies which account/
// device to sign into, but deliberately does NOT itself touch users,
// user_devices, or user_sessions: that orchestration (account status,
// lockout, device trust, actually issuing a session) belongs in the route
// alongside the password login path it mirrors (src/app/api/auth/login/route.ts),
// not duplicated here. Cryptographic verification succeeding is
// authentication of the *device*, not yet authorization to establish a
// session — the route layer still applies the same account/device checks
// password login does before calling createLoginSession.
export async function verifyMobileBiometricLogin(assertion: MobileBiometricAssertion): Promise<MobileBiometricLoginResult> {
  const credential = await findLoginMobileBiometricCredential(assertion.credentialId);
  if (!credential) {
    throw new Error("Kredensial biometrik tidak dikenali. Silakan gunakan password.");
  }

  const consumed = await consumeWebauthnChallenge(credential.user_id, assertion.challenge, "LOGIN");
  if (!consumed) {
    throw new Error("Verifikasi biometrik gagal. Silakan gunakan password.");
  }

  if (!verifySignature(credential, assertion.challenge, assertion.signature)) {
    throw new Error("Verifikasi biometrik gagal. Silakan gunakan password.");
  }

  await touchMobileBiometricCredentialUsage(credential.id);
  return { userId: credential.user_id, deviceId: credential.device_id };
}
