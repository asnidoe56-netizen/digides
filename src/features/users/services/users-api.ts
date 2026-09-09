import { apiFetch } from "@/lib/api/client";
import type { PublicUserProfile, UserStatus } from "@/types/user";
import type { UpdateUserProfileValues } from "../schemas/user-profile.schema";

export interface UpdateUserStatusResponse {
  id: string;
  status: UserStatus;
}

export function updateUserStatus(userId: string, status: UserStatus): Promise<UpdateUserStatusResponse> {
  return apiFetch<UpdateUserStatusResponse>(`/api/users/${userId}`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}

export function updateUserProfile(
  userId: string,
  values: UpdateUserProfileValues,
): Promise<{ user: PublicUserProfile }> {
  return apiFetch<{ user: PublicUserProfile }>(`/api/users/${userId}/profile`, {
    method: "PATCH",
    body: JSON.stringify(values),
  });
}

// docs/security/PEMULIHAN_AKSES_AKUN.md §4 Prioritas 2.
export function unlockUserAccount(userId: string): Promise<{ success: true }> {
  return apiFetch<{ success: true }>(`/api/users/${userId}/unlock`, { method: "POST" });
}

export interface AdminPasswordResetResponse {
  /** Plaintext, returned exactly once — never stored, never fetchable again. */
  temporaryPassword: string;
  userName: string;
  userEmail: string;
  revokedSessions: number;
}

// §4 Prioritas 1. The response is the only place the temporary password
// ever exists in readable form, so the caller must show it to the admin
// immediately rather than discarding it and re-fetching.
export function resetUserPassword(userId: string): Promise<AdminPasswordResetResponse> {
  return apiFetch<AdminPasswordResetResponse>(`/api/users/${userId}/reset-password`, {
    method: "POST",
  });
}
