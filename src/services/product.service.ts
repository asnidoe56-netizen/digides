import { recordAuditLog } from "@/repositories/audit.repository";
import { setProductAdminDisabled, setProductMerchandisingTag } from "@/repositories/product.repository";
import type { MerchandisingTag } from "@/types/product";

// The Produk page's own "Aktifkan/Nonaktifkan" switch — independent of
// Digiflazz's own status (ACTIVE/GANGGUAN/DISABLED, refreshed by every
// catalog sync). Both catalog.service.ts's buyer-facing catalog and
// transaction.service.ts's executeTransaction check this alongside
// `status`, so turning a product off here blocks new purchases
// immediately without needing Digiflazz to disable it on their end.
export async function setProductAvailability(productId: string, disabled: boolean, actorUserId: string) {
  const product = await setProductAdminDisabled(productId, disabled);
  if (!product) {
    throw new Error("Produk tidak ditemukan");
  }

  await recordAuditLog({
    actor_user_id: actorUserId,
    action: disabled ? "PRODUCT_ADMIN_DISABLED" : "PRODUCT_ADMIN_ENABLED",
    entity: "products",
    entity_id: product.id,
  });

  return product;
}

// Purely a storefront label — Super Murah / Promo / Terlaris, or null to
// clear it. Never affects whether the product can actually be purchased.
export async function setProductTag(productId: string, tag: MerchandisingTag | null, actorUserId: string) {
  const product = await setProductMerchandisingTag(productId, tag);
  if (!product) {
    throw new Error("Produk tidak ditemukan");
  }

  await recordAuditLog({
    actor_user_id: actorUserId,
    action: "PRODUCT_TAG_UPDATED",
    entity: "products",
    entity_id: product.id,
    new_value: { merchandising_tag: tag },
  });

  return product;
}
