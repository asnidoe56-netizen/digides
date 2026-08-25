import { recordAuditLog } from "@/repositories/audit.repository";
import {
  createBrand,
  listBrandsWithProductCount,
  renameBrand,
  updateBrandStatus,
} from "@/repositories/product.repository";
import type { CatalogStatus } from "@/types/product";

export async function getBrands() {
  return listBrandsWithProductCount();
}

export async function addBrand(name: string, actorUserId: string) {
  const trimmed = name.trim();
  if (!trimmed) {
    throw new Error("Nama brand wajib diisi");
  }

  let brand;
  try {
    brand = await createBrand(trimmed);
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new Error("Brand dengan nama ini sudah ada");
    }
    throw error;
  }

  await recordAuditLog({
    actor_user_id: actorUserId,
    action: "BRAND_CREATED",
    entity: "brands",
    entity_id: brand.id,
    new_value: { name: brand.name },
  });

  return brand;
}

export async function renameBrandAndAudit(id: string, name: string, actorUserId: string) {
  const trimmed = name.trim();
  if (!trimmed) {
    throw new Error("Nama brand wajib diisi");
  }

  let brand;
  try {
    brand = await renameBrand(id, trimmed);
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new Error("Brand dengan nama ini sudah ada");
    }
    throw error;
  }
  if (!brand) {
    throw new Error("Brand tidak ditemukan");
  }

  await recordAuditLog({
    actor_user_id: actorUserId,
    action: "BRAND_RENAMED",
    entity: "brands",
    entity_id: brand.id,
    new_value: { name: brand.name },
  });

  return brand;
}

// Disabling a brand isn't cosmetic — the Transaction Engine's
// executeTransaction rejects a purchase whose product belongs to a
// DISABLED brand (see transaction.service.ts). Products stay visible in
// the catalog either way; only new purchases are blocked.
export async function setBrandStatus(id: string, status: CatalogStatus, actorUserId: string) {
  const brand = await updateBrandStatus(id, status);
  if (!brand) {
    throw new Error("Brand tidak ditemukan");
  }

  await recordAuditLog({
    actor_user_id: actorUserId,
    action: status === "DISABLED" ? "BRAND_DISABLED" : "BRAND_ENABLED",
    entity: "brands",
    entity_id: brand.id,
  });

  return brand;
}

const UNIQUE_VIOLATION = "23505";

function isUniqueViolation(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === UNIQUE_VIOLATION;
}
