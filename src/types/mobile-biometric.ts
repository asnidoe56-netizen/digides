export type MobileBiometricAlgorithm = "RSA" | "ECDSA";
export type MobileBiometricPlatform = "android" | "ios";

export interface MobileBiometricCredential {
  id: string;
  user_id: string;
  credential_id: string;
  public_key: string;
  algorithm: MobileBiometricAlgorithm;
  platform: MobileBiometricPlatform;
  device_label: string;
  created_at: Date;
  last_used_at: Date | null;
  revoked_at: Date | null;
}

// The safe shape for the Keamanan screen's device list — never the raw
// public_key. credential_id IS included here (unlike the WebAuthn table's
// summary type): it's an opaque alias this app minted and controls on
// both ends, not a browser-native WebAuthn credential.id, and the Flutter
// client needs it back to delete the matching local Keystore key
// (biometric_signature's deleteKeys(keyAlias:)) when a mitra revokes a
// device from Akun > Keamanan.
export interface MobileBiometricCredentialSummary {
  id: string;
  credential_id: string;
  platform: MobileBiometricPlatform;
  device_label: string;
  created_at: Date;
  last_used_at: Date | null;
}
