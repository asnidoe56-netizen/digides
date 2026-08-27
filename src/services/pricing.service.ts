import { withTransaction } from "@/lib/db/transaction";
import { recordAuditLog } from "@/repositories/audit.repository";
import {
  bulkUpsertProductMarkup,
  listApplicableMarkupRules,
  listCategoryMarkups,
  listEffectiveMarkupsByProductId,
  listProductMarkups,
  upsertCategoryMarkup,
  upsertProductMarkup,
  type ListProductsFilter,
} from "@/repositories/product.repository";
import type { ProductStatus } from "@/types/product";

export async function getCategoryMarkups() {
  return listCategoryMarkups();
}

export interface SetCategoryMarkupInput {
  categoryId: string;
  /** Rupiah, nominal — the only markup type the Markup menu exposes. */
  markupValue: number;
  actorUserId: string;
}

// The only way a category's markup changes — always logged, so "kenapa
// harga pulsa berubah jadi segini" always has an answer in the audit
// trail (same reasoning as wallet adjustments in wallet.service.ts).
export async function setCategoryMarkup(input: SetCategoryMarkupInput) {
  if (input.markupValue < 0) {
    throw new Error("Nominal markup tidak boleh negatif");
  }

  return withTransaction(async (client) => {
    const rule = await upsertCategoryMarkup(input.categoryId, input.markupValue, client);

    await recordAuditLog(
      {
        actor_user_id: input.actorUserId,
        action: "MARKUP_CATEGORY_UPDATED",
        entity: "markup_rules",
        entity_id: rule.id,
        new_value: { category_id: input.categoryId, markup_value: input.markupValue },
      },
      client,
    );

    return rule;
  });
}

// The real price a purchase charges — walks PRODUCT > BRAND > CATEGORY >
// GLOBAL and takes the most specific rule, rather than always reading the
// category's flat markup. Used by both the buyer-facing catalog (what
// price is shown while browsing) and the transaction engine (what's
// actually charged), so the two can never disagree.
export async function getEffectiveMarkupValue(product: {
  id: string;
  category_id: string | null;
  brand_id: string | null;
}): Promise<string> {
  const rules = await listApplicableMarkupRules({
    productId: product.id,
    categoryId: product.category_id,
    brandId: product.brand_id,
  });
  return rules[0]?.markup_value ?? "0";
}

export async function getEffectiveMarkupsByProductId(productIds: string[]) {
  return listEffectiveMarkupsByProductId(productIds);
}

export async function getProductMarkups(filter: ListProductsFilter = {}) {
  return listProductMarkups(filter);
}

export interface SetProductMarkupInput {
  productId: string;
  markupValue: number;
  actorUserId: string;
}

// One product's own override — takes priority over its brand/category/
// global markup from that point on (getEffectiveMarkupValue).
export async function setProductMarkup(input: SetProductMarkupInput) {
  if (input.markupValue < 0) {
    throw new Error("Nominal markup tidak boleh negatif");
  }

  return withTransaction(async (client) => {
    const rule = await upsertProductMarkup(input.productId, input.markupValue, client);

    await recordAuditLog(
      {
        actor_user_id: input.actorUserId,
        action: "MARKUP_PRODUCT_UPDATED",
        entity: "markup_rules",
        entity_id: rule.id,
        new_value: { product_id: input.productId, markup_value: input.markupValue },
      },
      client,
    );

    return rule;
  });
}

export interface BulkSetProductMarkupInput {
  categoryId?: string;
  brandId?: string;
  search?: string;
  status?: ProductStatus;
  markupValue: number;
  actorUserId: string;
}

// "Terapkan ke semua produk pada filter ini sekaligus" — e.g. Kategori
// Pulsa + Provider TELKOMSEL, one nominal for every product that matches.
// Requires at least one of categoryId/brandId so a slip can't accidentally
// bulk-apply across the entire catalog with no filter at all.
export async function bulkSetProductMarkup(input: BulkSetProductMarkupInput) {
  if (input.markupValue < 0) {
    throw new Error("Nominal markup tidak boleh negatif");
  }
  if (!input.categoryId && !input.brandId) {
    throw new Error("Pilih kategori atau provider terlebih dahulu sebelum menerapkan markup massal");
  }

  return withTransaction(async (client) => {
    const productIds = await bulkUpsertProductMarkup(
      {
        categoryId: input.categoryId,
        brandId: input.brandId,
        search: input.search,
        status: input.status,
      },
      input.markupValue,
      client,
    );

    for (const productId of productIds) {
      await recordAuditLog(
        {
          actor_user_id: input.actorUserId,
          action: "MARKUP_PRODUCT_BULK_UPDATED",
          entity: "markup_rules",
          entity_id: productId,
          new_value: { product_id: productId, markup_value: input.markupValue },
        },
        client,
      );
    }

    return { affected: productIds.length };
  });
}
