import { apiFetch } from "@/lib/api/client";
import type { CategoryMarkupFormValues } from "../schemas/category-markup.schema";

export function updateCategoryMarkup(categoryId: string, values: CategoryMarkupFormValues) {
  return apiFetch(`/api/markup/categories/${categoryId}`, {
    method: "PATCH",
    body: JSON.stringify(values),
  });
}
