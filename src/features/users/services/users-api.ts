import { apiFetch } from "@/lib/api/client";
import type { User, UserStatus } from "@/types/user";
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

export function updateUserProfile(userId: string, values: UpdateUserProfileValues): Promise<{ user: User }> {
  return apiFetch<{ user: User }>(`/api/users/${userId}/profile`, {
    method: "PATCH",
    body: JSON.stringify(values),
  });
}
