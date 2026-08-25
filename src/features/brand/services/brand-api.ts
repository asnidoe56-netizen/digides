import { apiFetch } from "@/lib/api/client";
import type { BrandNameFormValues } from "../schemas/brand.schema";

export function createBrand(values: BrandNameFormValues) {
  return apiFetch("/api/brands", {
    method: "POST",
    body: JSON.stringify(values),
  });
}

export function renameBrand(id: string, values: BrandNameFormValues) {
  return apiFetch(`/api/brands/${id}`, {
    method: "PATCH",
    body: JSON.stringify(values),
  });
}

export function setBrandStatus(id: string, status: "ACTIVE" | "DISABLED") {
  return apiFetch(`/api/brands/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}
