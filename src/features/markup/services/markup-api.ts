import { apiFetch } from "@/lib/api/client";
import type { CategoryMarkupFormValues } from "../schemas/category-markup.schema";
import type { BulkProductMarkupFormValues, ProductMarkupFormValues } from "../schemas/product-markup.schema";

export function updateCategoryMarkup(categoryId: string, values: CategoryMarkupFormValues) {
  return apiFetch(`/api/markup/categories/${categoryId}`, {
    method: "PATCH",
    body: JSON.stringify(values),
  });
}

export function updateProductMarkup(productId: string, values: ProductMarkupFormValues) {
  return apiFetch(`/api/markup/products/${productId}`, {
    method: "PATCH",
    body: JSON.stringify(values),
  });
}

export function bulkUpdateProductMarkup(values: BulkProductMarkupFormValues) {
  return apiFetch<{ affected: number }>("/api/markup/products/bulk", {
    method: "POST",
    body: JSON.stringify(values),
  });
}
