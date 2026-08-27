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
