import { apiFetch } from "@/lib/api/client";
import type { PublicUserProfile } from "@/types/user";
import type { MitraProfileValues } from "../schemas/profile.schema";
import type { ChangePasswordServerInput } from "../schemas/change-password.schema";
import type { ChangePinServerInput } from "../schemas/change-pin.schema";

// Always scoped to the caller's own session on the server (POST /api/account/profile)
// — there is no user id in this request, unlike the Super Admin
// counterpart in features/users/services/users-api.ts.
export function updateMyProfile(values: MitraProfileValues): Promise<{ user: PublicUserProfile }> {
  return apiFetch<{ user: PublicUserProfile }>("/api/account/profile", {
    method: "PATCH",
    body: JSON.stringify(values),
  });
}

// Akun > Ganti Password (POST /api/account/change-password) — confirmPassword
// is a form-only field, never sent.
export function changeMyPassword(values: ChangePasswordServerInput): Promise<{ success: boolean }> {
  return apiFetch<{ success: boolean }>("/api/account/change-password", {
    method: "POST",
    body: JSON.stringify(values),
  });
}

// Akun > Ganti PIN (POST /api/account/change-pin) — confirmPin is a
// form-only field, never sent.
export function changeMyPin(values: ChangePinServerInput): Promise<{ success: boolean }> {
  return apiFetch<{ success: boolean }>("/api/account/change-pin", {
    method: "POST",
    body: JSON.stringify(values),
  });
}
