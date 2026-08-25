import { apiFetch } from "@/lib/api/client";
import type { DeviceTrustStatus } from "@/types/security";
import type { SecurityPolicyFormValues } from "../schemas/policy.schema";

export function setDeviceStatus(deviceId: string, status: DeviceTrustStatus) {
  return apiFetch(`/api/security/devices/${deviceId}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}

export function revokeSession(sessionId: string) {
  return apiFetch(`/api/security/sessions/${sessionId}/revoke`, { method: "PATCH" });
}

export function revokeAllSessionsForUser(userId: string) {
  return apiFetch(`/api/security/users/${userId}/sessions/revoke-all`, { method: "PATCH" });
}

export function saveSecurityPolicy(values: SecurityPolicyFormValues) {
  return apiFetch("/api/security/policy", {
    method: "PATCH",
    body: JSON.stringify(values),
  });
}

export function setIncidentStatus(
  incidentId: string,
  status: "INVESTIGATING" | "RESOLVED" | "DISMISSED",
  note?: string,
) {
  return apiFetch(`/api/security/incidents/${incidentId}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status, note }),
  });
}
