import { apiFetch } from "@/lib/api/client";
import type { GenerateReferralCodeFormValues } from "../schemas/referral.schema";

export interface UserSearchResult {
  id: string;
  full_name: string;
  email: string;
}

export async function searchUsers(query: string): Promise<UserSearchResult[]> {
  const result = await apiFetch<{ users: UserSearchResult[] }>(`/api/users/search?q=${encodeURIComponent(query)}`);
  return result.users;
}

export function generateReferralCode(values: GenerateReferralCodeFormValues) {
  return apiFetch("/api/referrals/codes", {
    method: "POST",
    body: JSON.stringify(values),
  });
}

export function setReferralCodeStatus(codeId: string, isActive: boolean) {
  return apiFetch(`/api/referrals/codes/${codeId}/status`, {
    method: "PATCH",
    body: JSON.stringify({ isActive }),
  });
}

export function setReferralRelationshipStatus(relationshipId: string, status: "ACTIVE" | "BLOCKED") {
  return apiFetch(`/api/referrals/relationships/${relationshipId}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}
