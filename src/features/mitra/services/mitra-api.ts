import { apiFetch } from "@/lib/api/client";
import type { RegisterMitraServerInput } from "../schemas/register-mitra.schema";
import type { SendTopupFormValues } from "../schemas/send-topup.schema";

export function registerMitra(values: RegisterMitraServerInput) {
  return apiFetch("/api/mitra", {
    method: "POST",
    body: JSON.stringify(values),
  });
}

export function sendTopupToMitra(bumdesId: string, values: SendTopupFormValues) {
  return apiFetch(`/api/mitra/${bumdesId}/topup`, {
    method: "POST",
    body: JSON.stringify(values),
  });
}
