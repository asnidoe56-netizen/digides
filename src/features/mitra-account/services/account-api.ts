import { apiFetch } from "@/lib/api/client";
import type { User } from "@/types/user";
import type { MitraProfileValues } from "../schemas/profile.schema";

// Always scoped to the caller's own session on the server (POST /api/account/profile)
// — there is no user id in this request, unlike the Super Admin
// counterpart in features/users/services/users-api.ts.
export function updateMyProfile(values: MitraProfileValues): Promise<{ user: User }> {
  return apiFetch<{ user: User }>("/api/account/profile", {
    method: "PATCH",
    body: JSON.stringify(values),
  });
}
