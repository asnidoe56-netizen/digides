import { recordAuditLog } from "@/repositories/audit.repository";
import {
  createCategory,
  listCategoriesWithProductCount,
  updateCategoryDisplayName,
  updateCategoryStatus,
} from "@/repositories/product.repository";
import type { CatalogStatus } from "@/types/product";

export async function getCategories() {
  return listCategoriesWithProductCount();
}

export async function addCategory(name: string, actorUserId: string) {
  const trimmed = name.trim();
  if (!trimmed) {
    throw new Error("Nama kategori wajib diisi");
  }

  let category;
  try {
    category = await createCategory(trimmed);
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new Error("Kategori dengan nama ini sudah ada");
    }
    throw error;
  }

  await recordAuditLog({
    actor_user_id: actorUserId,
    action: "CATEGORY_CREATED",
    entity: "categories",
    entity_id: category.id,
    new_value: { name: category.name },
  });

  return category;
}

// Changes only the customer-facing label — never `name`, which catalog-sync
// relies on to keep matching this category to Digiflazz's own category
// label on every future sync.
export async function setCategoryDisplayNameAndAudit(id: string, displayName: string, actorUserId: string) {
  const trimmed = displayName.trim();
  if (!trimmed) {
    throw new Error("Nama tampilan wajib diisi");
  }

  const category = await updateCategoryDisplayName(id, trimmed);
  if (!category) {
    throw new Error("Kategori tidak ditemukan");
  }

  await recordAuditLog({
    actor_user_id: actorUserId,
    action: "CATEGORY_DISPLAY_NAME_CHANGED",
    entity: "categories",
    entity_id: category.id,
    new_value: { display_name: category.display_name },
  });

  return category;
}

// Disabling a category isn't cosmetic — the Transaction Engine's
// executeTransaction rejects a purchase whose product belongs to a
// DISABLED category (see transaction.service.ts). Products stay visible
// in the catalog either way; only new purchases are blocked.
export async function setCategoryStatus(id: string, status: CatalogStatus, actorUserId: string) {
  const category = await updateCategoryStatus(id, status);
  if (!category) {
    throw new Error("Kategori tidak ditemukan");
  }

  await recordAuditLog({
    actor_user_id: actorUserId,
    action: status === "DISABLED" ? "CATEGORY_DISABLED" : "CATEGORY_ENABLED",
    entity: "categories",
    entity_id: category.id,
  });

  return category;
}

const UNIQUE_VIOLATION = "23505";

function isUniqueViolation(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === UNIQUE_VIOLATION;
}
