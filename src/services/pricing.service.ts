import { withTransaction } from "@/lib/db/transaction";
import { recordAuditLog } from "@/repositories/audit.repository";
import { listCategoryMarkups, upsertCategoryMarkup } from "@/repositories/product.repository";

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
