import { recordAuditLog } from "@/repositories/audit.repository";
import {
  createCategory,
  listCategoriesWithProductCount,
  renameCategory,
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

export async function renameCategoryAndAudit(id: string, name: string, actorUserId: string) {
  const trimmed = name.trim();
  if (!trimmed) {
    throw new Error("Nama kategori wajib diisi");
  }

  let category;
  try {
    category = await renameCategory(id, trimmed);
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new Error("Kategori dengan nama ini sudah ada");
    }
    throw error;
  }
  if (!category) {
    throw new Error("Kategori tidak ditemukan");
  }

  await recordAuditLog({
    actor_user_id: actorUserId,
    action: "CATEGORY_RENAMED",
    entity: "categories",
    entity_id: category.id,
    new_value: { name: category.name },
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
