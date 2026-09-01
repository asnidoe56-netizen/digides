import type {
  PublicKeyCredentialCreationOptionsJSON,
  PublicKeyCredentialRequestOptionsJSON,
  RegistrationResponseJSON,
} from "@simplewebauthn/browser";
import { apiFetch } from "@/lib/api/client";
import type { BiometricCredentialSummary } from "@/types/biometric";

export function listMyBiometricCredentials(): Promise<{ credentials: BiometricCredentialSummary[] }> {
  return apiFetch<{ credentials: BiometricCredentialSummary[] }>("/api/account/biometric");
}

export function getBiometricRegistrationOptions(): Promise<PublicKeyCredentialCreationOptionsJSON> {
  return apiFetch<PublicKeyCredentialCreationOptionsJSON>("/api/account/biometric/register-options", {
    method: "POST",
  });
}

export function submitBiometricRegistration(
  response: RegistrationResponseJSON,
): Promise<{ credential: BiometricCredentialSummary }> {
  return apiFetch<{ credential: BiometricCredentialSummary }>("/api/account/biometric/register", {
    method: "POST",
    body: JSON.stringify(response),
  });
}

export function revokeBiometricCredential(id: string): Promise<{ success: boolean }> {
  return apiFetch<{ success: boolean }>(`/api/account/biometric/${id}`, { method: "DELETE" });
}

// Called from the purchase flow's PIN screen when the mitra taps "Gunakan
// Biometrik" — a fresh challenge scoped to whatever active credentials
// this account has, same server call regardless of which product/category
// is being purchased.
export function getTransactionBiometricOptions(): Promise<PublicKeyCredentialRequestOptionsJSON> {
  return apiFetch<PublicKeyCredentialRequestOptionsJSON>("/api/transactions/biometric-options", {
    method: "POST",
  });
}
