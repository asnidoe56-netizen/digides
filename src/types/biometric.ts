export interface BiometricCredential {
  id: string;
  user_id: string;
  credential_id: string;
  public_key: Buffer;
  counter: number;
  device_label: string;
  transports: string[] | null;
  created_at: Date;
  last_used_at: Date | null;
  revoked_at: Date | null;
}

// The safe shape for the Keamanan screen's device list — never the raw
// public_key/credential_id (no reason for those to ever leave the server).
export interface BiometricCredentialSummary {
  id: string;
  device_label: string;
  created_at: Date;
  last_used_at: Date | null;
}
