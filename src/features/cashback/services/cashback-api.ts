import { apiFetch } from "@/lib/api/client";
import type { CashbackRule, CashbackScopeType, CashbackType } from "@/types/cashback";
import type { CashbackPreview } from "@/services/cashback.service";

export interface CreateCashbackRulePayload {
  scopeType: CashbackScopeType;
  categoryId?: string | null;
  brandId?: string | null;
  productId?: string | null;
  cashbackType: CashbackType;
  cashbackValue: number;
  minTransaction?: number | null;
  maxCashback?: number | null;
  effectiveUntil?: string | null;
}

export function createCashbackRule(payload: CreateCashbackRulePayload) {
  return apiFetch<{ rule: CashbackRule }>("/api/cashback/rules", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function setCashbackRuleActive(id: string, isActive: boolean) {
  return apiFetch<{ rule: CashbackRule }>(`/api/cashback/rules/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ isActive }),
  });
}

// Tidak menulis apa pun — hanya menghitung berapa yang AKAN terbayar,
// memakai fungsi yang sama persis dengan mesin yang membayar.
export function previewCashback(payload: {
  productId: string;
  cashbackType: CashbackType;
  cashbackValue: number;
  maxCashback?: number | null;
}) {
  return apiFetch<{ preview: CashbackPreview }>("/api/cashback/preview", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
