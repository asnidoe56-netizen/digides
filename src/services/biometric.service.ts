import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
  type AuthenticationResponseJSON,
  type AuthenticatorTransportFuture,
  type RegistrationResponseJSON,
} from "@simplewebauthn/server";
import { isoUint8Array } from "@simplewebauthn/server/helpers";
import { getWebauthnConfig } from "@/lib/webauthn/config";
import { parseUserAgent } from "@/lib/security/user-agent";
import { findUserById } from "@/repositories/user.repository";
import {
  createBiometricCredential,
  findBiometricCredentialByCredentialId,
  listActiveBiometricCredentials,
  listBiometricCredentialSummaries,
  revokeBiometricCredential,
  touchBiometricCredentialUsage,
} from "@/repositories/biometric-credential.repository";
import { consumeWebauthnChallenge, createWebauthnChallenge } from "@/repositories/webauthn-challenge.repository";
import type { BiometricCredentialSummary } from "@/types/biometric";

export async function listMyBiometricCredentials(userId: string): Promise<BiometricCredentialSummary[]> {
  return listBiometricCredentialSummaries(userId);
}

export async function revokeMyBiometricCredential(userId: string, credentialRowId: string): Promise<void> {
  const revoked = await revokeBiometricCredential(credentialRowId, userId);
  if (!revoked) {
    throw new Error("Kredensial biometrik tidak ditemukan");
  }
}

// Akun > Keamanan's "Daftarkan Perangkat Ini" — step 1 of the WebAuthn
// registration ceremony (see @simplewebauthn/browser's startRegistration
// on the other end). excludeCredentials keeps a mitra from registering
// the very same authenticator twice.
export async function getBiometricRegistrationOptions(userId: string) {
  const user = await findUserById(userId);
  if (!user) {
    throw new Error("Pengguna tidak ditemukan");
  }

  const existing = await listActiveBiometricCredentials(userId);
  const { rpID, rpName } = getWebauthnConfig();

  const options = await generateRegistrationOptions({
    rpID,
    rpName,
    userID: isoUint8Array.fromASCIIString(user.id),
    userName: user.email,
    userDisplayName: user.full_name,
    attestationType: "none",
    authenticatorSelection: {
      authenticatorAttachment: "platform",
      userVerification: "required",
      residentKey: "preferred",
    },
    excludeCredentials: existing.map((credential) => ({
      id: credential.credential_id,
      transports: (credential.transports ?? undefined) as AuthenticatorTransportFuture[] | undefined,
    })),
  });

  await createWebauthnChallenge(userId, options.challenge, "REGISTRATION");
  return options;
}

// Step 2 — verifies the browser's attestation response and, on success,
// stores the new credential. deviceLabel defaults to a parsed User-Agent
// ("Chrome di Android") since asking the mitra to name their own device
// during onboarding is friction most won't bother with; they can rename
// nothing today (no rename endpoint yet), just revoke and re-register.
export async function verifyBiometricRegistration(
  userId: string,
  response: RegistrationResponseJSON,
  userAgent: string | null,
): Promise<BiometricCredentialSummary> {
  const { rpID, origin } = getWebauthnConfig();

  const verification = await verifyRegistrationResponse({
    response,
    expectedChallenge: async (challenge) => consumeWebauthnChallenge(userId, challenge, "REGISTRATION"),
    expectedOrigin: origin,
    expectedRPID: rpID,
    requireUserVerification: true,
  });

  if (!verification.verified || !verification.registrationInfo) {
    throw new Error("Verifikasi biometrik gagal. Coba lagi.");
  }

  const { credential } = verification.registrationInfo;
  const deviceLabel = parseUserAgent(userAgent).deviceName;

  const row = await createBiometricCredential({
    user_id: userId,
    credential_id: credential.id,
    public_key: Buffer.from(credential.publicKey),
    counter: credential.counter,
    device_label: deviceLabel,
    transports: credential.transports ?? null,
  });

  return { id: row.id, device_label: row.device_label, created_at: row.created_at, last_used_at: row.last_used_at };
}

// A transaction's "Gunakan Biometrik" button — step 1, scoped to this
// account's own active credentials via allowCredentials so the browser
// only offers authenticators that are actually usable here.
export async function getTransactionBiometricOptions(userId: string) {
  const credentials = await listActiveBiometricCredentials(userId);
  if (credentials.length === 0) {
    throw new Error("Belum ada perangkat biometrik yang terdaftar.");
  }

  const { rpID } = getWebauthnConfig();
  const options = await generateAuthenticationOptions({
    rpID,
    userVerification: "required",
    allowCredentials: credentials.map((credential) => ({
      id: credential.credential_id,
      transports: (credential.transports ?? undefined) as AuthenticatorTransportFuture[] | undefined,
    })),
  });

  await createWebauthnChallenge(userId, options.challenge, "TRANSACTION");
  return options;
}

// The biometric counterpart to auth.service.ts's verifyTransactionPin —
// called from transaction.service.ts's executeTransaction in place of a
// PIN check when the buyer confirmed with biometrics instead. Throws the
// same way a wrong/expired PIN attempt does, on any failure.
export async function verifyTransactionBiometric(
  userId: string,
  response: AuthenticationResponseJSON,
): Promise<void> {
  const credential = await findBiometricCredentialByCredentialId(response.id);
  if (!credential || credential.user_id !== userId) {
    throw new Error("Kredensial biometrik tidak dikenali.");
  }

  const { rpID, origin } = getWebauthnConfig();

  const verification = await verifyAuthenticationResponse({
    response,
    expectedChallenge: async (challenge) => consumeWebauthnChallenge(userId, challenge, "TRANSACTION"),
    expectedOrigin: origin,
    expectedRPID: rpID,
    credential: {
      id: credential.credential_id,
      publicKey: new Uint8Array(credential.public_key),
      counter: credential.counter,
      transports: (credential.transports ?? undefined) as AuthenticatorTransportFuture[] | undefined,
    },
    requireUserVerification: true,
  });

  if (!verification.verified) {
    throw new Error("Verifikasi biometrik gagal. Gunakan PIN sebagai gantinya.");
  }

  // The signature counter must never move backward — a lower-or-equal
  // value than what's on file is WebAuthn's own signal that this
  // authenticator's key material may have been cloned.
  if (verification.authenticationInfo.newCounter <= credential.counter && credential.counter !== 0) {
    throw new Error("Verifikasi biometrik gagal. Gunakan PIN sebagai gantinya.");
  }

  await touchBiometricCredentialUsage(credential.id, verification.authenticationInfo.newCounter);
}
