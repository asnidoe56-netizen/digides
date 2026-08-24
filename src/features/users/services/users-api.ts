import { apiFetch } from "@/lib/api/client";
import type { UserStatus } from "@/types/user";

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
