import { apiFetch } from "@/lib/api/client";
import type { ManualTopupDestinationFormValues } from "../schemas/manual-topup-destination.schema";

export function saveManualTopupDestination(values: ManualTopupDestinationFormValues) {
  return apiFetch("/api/wallet/topup-destination", {
    method: "PATCH",
    body: JSON.stringify(values),
  });
}
