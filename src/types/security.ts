export type DeviceTrustStatus = "TRUSTED" | "PENDING" | "BLOCKED" | "REVOKED";

export interface UserDevice {
  id: string;
  user_id: string;
  fingerprint: string;
  device_name: string;
  platform: string;
  browser: string;
  user_agent: string;
  last_ip: string | null;
  trust_status: DeviceTrustStatus;
  first_seen_at: Date;
  last_seen_at: Date;
}

export interface UserSession {
  id: string;
  user_id: string;
  device_id: string;
  ip_address: string | null;
  user_agent: string;
  created_at: Date;
  last_active_at: Date;
  expires_at: Date;
  revoked_at: Date | null;
  revoked_reason: string | null;
}

export type LoginActivityEventType =
  | "LOGIN_SUCCESS"
  | "LOGIN_FAILED"
  | "LOGOUT"
  | "NEW_DEVICE"
  | "SESSION_REVOKED"
  | "ACCOUNT_LOCKED";

export interface LoginActivity {
  id: string;
  user_id: string | null;
  attempted_email: string;
  event_type: LoginActivityEventType;
  device_id: string | null;
  ip_address: string | null;
  user_agent: string | null;
  detail: string | null;
  created_at: Date;
}

export interface SecurityPolicy {
  id: string;
  max_devices_per_user: number;
  max_login_attempts: number;
  login_lockout_minutes: number;
  require_device_verification: boolean;
  session_timeout_minutes: number;
  max_pin_attempts: number;
  pin_lockout_minutes: number;
  updated_at: Date;
  updated_by: string | null;
}

export type SecurityIncidentType = "BRUTE_FORCE_LOGIN" | "PIN_LOCKOUT" | "SUSPICIOUS_DEVICE";
export type SecurityIncidentSeverity = "LOW" | "MEDIUM" | "HIGH";
export type SecurityIncidentStatus = "OPEN" | "INVESTIGATING" | "RESOLVED" | "DISMISSED";

export interface SecurityIncident {
  id: string;
  type: SecurityIncidentType;
  severity: SecurityIncidentSeverity;
  user_id: string | null;
  device_id: string | null;
  status: SecurityIncidentStatus;
  description: string;
  created_at: Date;
  resolved_at: Date | null;
  resolved_by: string | null;
  resolution_note: string | null;
}
