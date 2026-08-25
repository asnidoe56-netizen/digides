import { apiFetch } from "@/lib/api/client";
import type { CategoryNameFormValues } from "../schemas/category.schema";

export function createCategory(values: CategoryNameFormValues) {
  return apiFetch("/api/categories", {
    method: "POST",
    body: JSON.stringify(values),
  });
}

export function renameCategory(id: string, values: CategoryNameFormValues) {
  return apiFetch(`/api/categories/${id}`, {
    method: "PATCH",
    body: JSON.stringify(values),
  });
}

export function setCategoryStatus(id: string, status: "ACTIVE" | "DISABLED") {
  return apiFetch(`/api/categories/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}
