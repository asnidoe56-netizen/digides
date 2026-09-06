import { apiFetch } from "@/lib/api/client";
import type { ManualPaymentMethodFormValues } from "../schemas/manual-payment-method.schema";
import type { CreateManualPaymentMethodFormValues } from "../schemas/create-manual-payment-method.schema";

export function createManualPaymentMethod(values: CreateManualPaymentMethodFormValues) {
  return apiFetch("/api/wallet/payment-methods", {
    method: "POST",
    body: JSON.stringify(values),
  });
}

export function updateManualPaymentMethod(id: string, values: ManualPaymentMethodFormValues) {
  return apiFetch(`/api/wallet/payment-methods/${id}`, {
    method: "PATCH",
    body: JSON.stringify(values),
  });
}

export function setManualPaymentMethodStatus(id: string, isActive: boolean) {
  return apiFetch(`/api/wallet/payment-methods/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ isActive }),
  });
}
