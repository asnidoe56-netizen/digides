import { SESSION_MAX_AGE_SECONDS } from "@/lib/auth/session";
import { fingerprintDevice, parseUserAgent } from "@/lib/security/user-agent";
import { recordAuditLog } from "@/repositories/audit.repository";
import {
  countRecentFailedLogins,
  listLoginActivities,
  countLoginActivities,
  recordLoginActivity,
  type ListLoginActivitiesFilter,
} from "@/repositories/login-activity.repository";
import {
  createSecurityIncident,
  findSecurityIncidentById,
  listSecurityIncidents,
  countSecurityIncidents,
  setSecurityIncidentStatus,
  type ListSecurityIncidentsFilter,
} from "@/repositories/security-incident.repository";
import { getSecurityPolicy, updateSecurityPolicy, type UpdateSecurityPolicyInput } from "@/repositories/security-policy.repository";
import {
  resetPinFailedAttempts,
  clearUserAccountLock,
  lockUserAccount,
  findUserById,
  updateUserMaxActiveDevices,
} from "@/repositories/user.repository";
import {
  countActiveDevicesForUser,
  createUserDevice,
  findDeviceByFingerprint,
  findDeviceById,
  listDevices,
  listDevicesForUser,
  countDevices,
  setDeviceTrustStatus,
  touchDevice,
  type ListDevicesFilter,
} from "@/repositories/user-device.repository";
import {
  createUserSession,
  listSessions,
  countSessions,
  revokeAllSessionsForDevice,
  revokeAllSessionsForUser,
  revokeSession,
  type ListSessionsFilter,
} from "@/repositories/user-session.repository";
import type { DeviceTrustStatus, SecurityIncidentStatus, UserDevice, UserSession } from "@/types/security";

// --- Login-time enforcement --------------------------------------------
// Called directly from /api/auth/login, before any session exists — kept
// here rather than in the route so the brute-force/device-trust/session
// rules live next to the rest of the Security module's logic.

export async function recordFailedLogin(
  email: string,
  userId: string | null,
  ipAddress: string | null,
  userAgent: string | null,
  detail: string,
): Promise<{ locked: boolean; lockoutMinutes: number }> {
  await recordLoginActivity({
    user_id: userId,
    attempted_email: email,
    event_type: "LOGIN_FAILED",
    ip_address: ipAddress,
    user_agent: userAgent,
    detail,
  });

  if (!userId) return { locked: false, lockoutMinutes: 0 };

  const policy = await getSecurityPolicy();
  const recentFailures = await countRecentFailedLogins(email, policy.login_lockout_minutes);
  if (recentFailures < policy.max_login_attempts) {
    return { locked: false, lockoutMinutes: 0 };
  }

  const lockedUntil = new Date(Date.now() + policy.login_lockout_minutes * 60_000);
  await lockUserAccount(userId, lockedUntil);
  await recordLoginActivity({
    user_id: userId,
    attempted_email: email,
    event_type: "ACCOUNT_LOCKED",
    ip_address: ipAddress,
    user_agent: userAgent,
    detail: `${recentFailures} percobaan gagal dalam ${policy.login_lockout_minutes} menit terakhir`,
  });
  await createSecurityIncident({
    type: "BRUTE_FORCE_LOGIN",
    severity: "HIGH",
    user_id: userId,
    description: `Terdeteksi ${recentFailures} percobaan login gagal beruntun untuk ${email}. Akun dikunci otomatis selama ${policy.login_lockout_minutes} menit.`,
  });

  return { locked: true, lockoutMinutes: policy.login_lockout_minutes };
}

// A mitra's own "Batasi Perangkat" override never raises their limit
// above the platform-wide default, only lowers it — even if Super Admin
// later drops security_policies.max_devices_per_user below whatever a
// mitra previously self-selected, the stricter of the two always wins.
export function getEffectiveDeviceLimit(userMaxActiveDevices: number | null, policyMaxDevicesPerUser: number): number {
  if (userMaxActiveDevices == null) return policyMaxDevicesPerUser;
  return Math.min(userMaxActiveDevices, policyMaxDevicesPerUser);
}

export type DeviceAuthorizationResult =
  | { allowed: true; deviceId: string }
  | { allowed: false; reason: string; status: number };

export async function authorizeDeviceForLogin(
  userId: string,
  email: string,
  ipAddress: string | null,
  userAgent: string | null,
  userMaxActiveDevices: number | null,
): Promise<DeviceAuthorizationResult> {
  const policy = await getSecurityPolicy();
  const fingerprint = fingerprintDevice(userId, userAgent);
  const existing = await findDeviceByFingerprint(userId, fingerprint);

  async function rejectDevice(reason: string, detail: string, status = 403): Promise<DeviceAuthorizationResult> {
    await recordLoginActivity({
      user_id: userId,
      attempted_email: email,
      event_type: "LOGIN_FAILED",
      device_id: existing?.id ?? null,
      ip_address: ipAddress,
      user_agent: userAgent,
      detail,
    });
    return { allowed: false, reason, status };
  }

  if (existing) {
    if (existing.trust_status === "BLOCKED" || existing.trust_status === "REVOKED") {
      return rejectDevice("Perangkat ini telah diblokir. Hubungi admin untuk informasi lebih lanjut.", "Perangkat diblokir");
    }
    if (existing.trust_status === "PENDING") {
      return rejectDevice("Perangkat ini masih menunggu persetujuan admin sebelum dapat digunakan.", "Menunggu verifikasi perangkat");
    }
    await touchDevice(existing.id, ipAddress);
    return { allowed: true, deviceId: existing.id };
  }

  const activeDeviceCount = await countActiveDevicesForUser(userId);
  const effectiveLimit = getEffectiveDeviceLimit(userMaxActiveDevices, policy.max_devices_per_user);
  if (activeDeviceCount >= effectiveLimit) {
    return rejectDevice(
      "Batas jumlah perangkat tercapai. Cabut akses salah satu perangkat lama di Akun > Perangkat, atau perbesar batas di Akun > Keamanan.",
      "Batas jumlah perangkat tercapai",
    );
  }

  const { platform, browser, deviceName } = parseUserAgent(userAgent);
  const trustStatus: DeviceTrustStatus = policy.require_device_verification ? "PENDING" : "TRUSTED";
  const device = await createUserDevice({
    user_id: userId,
    fingerprint,
    device_name: deviceName,
    platform,
    browser,
    user_agent: userAgent ?? "",
    last_ip: ipAddress,
    trust_status: trustStatus,
  });

  await recordLoginActivity({
    user_id: userId,
    attempted_email: email,
    event_type: "NEW_DEVICE",
    device_id: device.id,
    ip_address: ipAddress,
    user_agent: userAgent,
    detail: deviceName,
  });

  if (trustStatus === "PENDING") {
    return rejectDevice(
      "Perangkat baru terdeteksi dan menunggu persetujuan admin sebelum dapat digunakan.",
      "Perangkat baru menunggu verifikasi",
    );
  }

  return { allowed: true, deviceId: device.id };
}

export async function createLoginSession(
  userId: string,
  deviceId: string,
  email: string,
  ipAddress: string | null,
  userAgent: string | null,
): Promise<UserSession> {
  await clearUserAccountLock(userId);

  const expiresAt = new Date(Date.now() + SESSION_MAX_AGE_SECONDS * 1000);
  const session = await createUserSession({
    user_id: userId,
    device_id: deviceId,
    ip_address: ipAddress,
    user_agent: userAgent ?? "",
    expires_at: expiresAt,
  });

  await recordLoginActivity({
    user_id: userId,
    attempted_email: email,
    event_type: "LOGIN_SUCCESS",
    device_id: deviceId,
    ip_address: ipAddress,
    user_agent: userAgent,
  });

  return session;
}

// --- Admin-facing reads/actions -----------------------------------------

export async function getDevices(filter: ListDevicesFilter = {}) {
  return listDevices(filter);
}

export async function getDeviceCount(filter: ListDevicesFilter = {}) {
  return countDevices(filter);
}

export async function setDeviceTrust(deviceId: string, status: DeviceTrustStatus, actorUserId: string) {
  const device = await setDeviceTrustStatus(deviceId, status);
  if (!device) {
    throw new Error("Perangkat tidak ditemukan");
  }

  if (status === "BLOCKED" || status === "REVOKED") {
    await revokeAllSessionsForDevice(deviceId, `DEVICE_${status}`);
  }

  await recordAuditLog({
    actor_user_id: actorUserId,
    action: "SECURITY_DEVICE_TRUST_CHANGED",
    entity: "user_devices",
    entity_id: device.id,
    new_value: { trust_status: status, owner_user_id: device.user_id },
  });

  return device;
}

// --- Mitra self-service (Akun > Perangkat) ------------------------------
// A mitra's own view of the same user_devices/user_sessions rows the
// admin-facing functions above manage platform-wide, scoped to just their
// own account.

export interface MyDevicesOverview {
  devices: UserDevice[];
  totalCount: number;
  activeCount: number;
  maxDevices: number;
  currentDeviceId: string | null;
}

export async function getMyDevices(userId: string, currentDeviceId: string | null): Promise<MyDevicesOverview> {
  const [devices, activeCount, policy, user] = await Promise.all([
    listDevicesForUser(userId),
    countActiveDevicesForUser(userId),
    getSecurityPolicy(),
    findUserById(userId),
  ]);

  return {
    devices,
    totalCount: devices.length,
    activeCount,
    maxDevices: getEffectiveDeviceLimit(user?.max_active_devices ?? null, policy.max_devices_per_user),
    currentDeviceId,
  };
}

// Akun > Keamanan's "Batasi Perangkat" — the mitra's own read/write on
// their max_active_devices override. 1-5 is enforced by the DB check
// constraint (029_users_max_active_devices.sql) as the final backstop;
// the route layer validates the same range so a bad request never even
// reaches the database.
export interface MyDeviceLimit {
  currentLimit: number;
  isCustom: boolean;
  options: number[];
}

const DEVICE_LIMIT_OPTIONS = [1, 2, 3, 4, 5];

export async function getMyDeviceLimit(userId: string): Promise<MyDeviceLimit> {
  const [user, policy] = await Promise.all([findUserById(userId), getSecurityPolicy()]);
  return {
    currentLimit: getEffectiveDeviceLimit(user?.max_active_devices ?? null, policy.max_devices_per_user),
    isCustom: user?.max_active_devices != null,
    options: DEVICE_LIMIT_OPTIONS,
  };
}

export async function setMyDeviceLimit(userId: string, maxActiveDevices: number, actorUserId: string): Promise<void> {
  await updateUserMaxActiveDevices(userId, maxActiveDevices);
  await recordAuditLog({
    actor_user_id: actorUserId,
    action: "USER_DEVICE_LIMIT_CHANGED",
    entity: "users",
    entity_id: userId,
    new_value: { max_active_devices: maxActiveDevices },
  });
}

// setDeviceTrust (above) has no ownership check — its only other caller
// is the Super Admin route, already role-gated — so this is where a
// mitra's "Blokir Perangkat" is confirmed to be blocking a device that's
// actually theirs. Blocking the device making this very request is
// refused: it would revoke the session performing the block, an easy way
// to lock yourself out with no way back in short of an admin restoring
// access.
export async function blockMyDevice(userId: string, deviceId: string, currentDeviceId: string | null) {
  const device = await findDeviceById(deviceId);
  if (!device || device.user_id !== userId) {
    throw new Error("Perangkat tidak ditemukan");
  }
  if (deviceId === currentDeviceId) {
    throw new Error("Tidak dapat memblokir perangkat yang sedang Anda gunakan.");
  }

  return setDeviceTrust(deviceId, "BLOCKED", userId);
}

export async function getSessions(filter: ListSessionsFilter = {}) {
  return listSessions(filter);
}

export async function getSessionCount(filter: ListSessionsFilter = {}) {
  return countSessions(filter);
}

export async function revokeSessionAndAudit(sessionId: string, actorUserId: string) {
  const session = await revokeSession(sessionId, "ADMIN_REVOKED");
  if (!session) {
    throw new Error("Sesi tidak ditemukan atau sudah dicabut");
  }

  await recordAuditLog({
    actor_user_id: actorUserId,
    action: "SECURITY_SESSION_REVOKED",
    entity: "user_sessions",
    entity_id: session.id,
    new_value: { user_id: session.user_id },
  });

  return session;
}

export async function revokeAllSessionsForUserAndAudit(userId: string, actorUserId: string) {
  const revokedCount = await revokeAllSessionsForUser(userId, "ADMIN_REVOKED_ALL");

  await recordAuditLog({
    actor_user_id: actorUserId,
    action: "SECURITY_ALL_SESSIONS_REVOKED",
    entity: "users",
    entity_id: userId,
    new_value: { revoked_count: revokedCount },
  });

  return revokedCount;
}

export async function getLoginActivities(filter: ListLoginActivitiesFilter = {}) {
  return listLoginActivities(filter);
}

export async function getLoginActivityCount(filter: ListLoginActivitiesFilter = {}) {
  return countLoginActivities(filter);
}

export async function getSecurityPolicyForDisplay() {
  return getSecurityPolicy();
}

export async function updateSecurityPolicyAndAudit(input: UpdateSecurityPolicyInput, actorUserId: string) {
  const current = await getSecurityPolicy();
  const updated = await updateSecurityPolicy(current.id, input, actorUserId);

  await recordAuditLog({
    actor_user_id: actorUserId,
    action: "SECURITY_POLICY_UPDATED",
    entity: "security_policies",
    entity_id: updated.id,
    old_value: { ...current },
    new_value: { ...updated },
  });

  return updated;
}

export async function getSecurityIncidents(filter: ListSecurityIncidentsFilter = {}) {
  return listSecurityIncidents(filter);
}

export async function getSecurityIncidentCount(filter: ListSecurityIncidentsFilter = {}) {
  return countSecurityIncidents(filter);
}

// Resolving/dismissing an incident also performs the actual recovery
// action it represents — clearing the account lock a BRUTE_FORCE_LOGIN
// incident caused, or resetting PIN failures for a PIN_LOCKOUT incident —
// so an admin doesn't have to remember a second manual step per the PRD's
// "Admin menangani investigasi dan recovery."
export async function setSecurityIncidentStatusAndAudit(
  incidentId: string,
  status: SecurityIncidentStatus,
  resolutionNote: string | null,
  actorUserId: string,
) {
  const existing = await findSecurityIncidentById(incidentId);
  if (!existing) {
    throw new Error("Insiden tidak ditemukan");
  }

  const incident = await setSecurityIncidentStatus(incidentId, status, actorUserId, resolutionNote);
  if (!incident) {
    throw new Error("Insiden sudah diproses sebelumnya");
  }

  if (status === "RESOLVED" && incident.user_id) {
    if (incident.type === "BRUTE_FORCE_LOGIN") {
      await clearUserAccountLock(incident.user_id);
    } else if (incident.type === "PIN_LOCKOUT") {
      await resetPinFailedAttempts(incident.user_id);
    }
  }

  await recordAuditLog({
    actor_user_id: actorUserId,
    action: "SECURITY_INCIDENT_STATUS_CHANGED",
    entity: "security_incidents",
    entity_id: incident.id,
    new_value: { status, resolution_note: resolutionNote },
  });

  return incident;
}

