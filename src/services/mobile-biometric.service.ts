import { randomBytes, createVerify } from "crypto";
import {
  createMobileBiometricCredential,
  findMobileBiometricCredential,
  listActiveMobileBiometricCredentials,
  listMobileBiometricCredentialSummaries,
  revokeMobileBiometricCredential,
  touchMobileBiometricCredentialUsage,
} from "@/repositories/mobile-biometric-credential.repository";
import { createWebauthnChallenge, consumeWebauthnChallenge } from "@/repositories/webauthn-challenge.repository";
import type { MobileBiometricCredentialSummary, MobileBiometricAlgorithm, MobileBiometricPlatform } from "@/types/mobile-biometric";

export interface RegisterMobileBiometricInput {
  credentialId: string;
  publicKey: string;
  algorithm: MobileBiometricAlgorithm;
  platform: MobileBiometricPlatform;
  deviceLabel: string;
}

export async function listMyMobileBiometricCredentials(userId: string): Promise<MobileBiometricCredentialSummary[]> {
  return listMobileBiometricCredentialSummaries(userId);
}

// Akun > Keamanan's "Daftarkan Perangkat Ini" on Flutter — unlike WebAuthn
// registration, there is no attestation ceremony to verify here: the
// device already generated the key pair biometric-gated in secure
// hardware (biometric_signature's createKeys()) before this is ever
// called, and this endpoint's only job is to record the resulting public
// key against the session's own account.
export async function registerMobileBiometricCredential(
  userId: string,
  input: RegisterMobileBiometricInput,
): Promise<MobileBiometricCredentialSummary> {
  const row = await createMobileBiometricCredential({
    user_id: userId,
    credential_id: input.credentialId,
    public_key: input.publicKey,
    algorithm: input.algorithm,
    platform: input.platform,
    device_label: input.deviceLabel,
  });

  return {
    id: row.id,
    credential_id: row.credential_id,
    platform: row.platform,
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
// credential, otherwise the app would show a button that can only fail.
export async function getMobileBiometricTransactionChallenge(userId: string): Promise<{ challenge: string }> {
  const credentials = await listActiveMobileBiometricCredentials(userId);
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
  if (!credential) {
    throw new Error("Kredensial biometrik tidak dikenali.");
  }

  const verify = createVerify("SHA256");
  verify.update(Buffer.from(assertion.challenge, "base64"));
  verify.end();

  let signatureValid: boolean;
  try {
    signatureValid = verify.verify(credential.public_key, Buffer.from(assertion.signature, "base64"));
  } catch {
    signatureValid = false;
  }

  if (!signatureValid) {
    throw new Error("Verifikasi biometrik gagal. Gunakan PIN sebagai gantinya.");
  }

  await touchMobileBiometricCredentialUsage(credential.id);
}
