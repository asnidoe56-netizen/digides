import { withTransaction } from "@/lib/db/transaction";
import { recordAuditLog } from "@/repositories/audit.repository";
import {
  createCommissionLedgerEntry,
  createCommissionPayout,
  createCommissionRule,
  findCommissionRuleById,
  listActiveCommissionRules,
  listCommissionLedgerForBeneficiary,
  listCommissionLedgerGlobal,
  listCommissionPayouts,
  listCommissionRules,
  listSettleableCommissionLedgerIds,
  markCommissionAvailable,
  markCommissionLedgerPaid,
  markCommissionPayoutStatus,
  summarizeAvailableCommissionByBeneficiary,
  updateCommissionRule,
  type CreateCommissionRuleInput,
  type ListCommissionLedgerFilter,
} from "@/repositories/commission.repository";
import { findProductById } from "@/repositories/product.repository";
import { findRelationshipByReferredUser, findReferralCodeByUserId } from "@/repositories/referral.repository";
import { findTransactionById } from "@/repositories/transaction.repository";
import { getOwningUserId, getWalletByOwningUserId, postLedgerEntry } from "@/repositories/wallet.repository";
import type { CommissionLedgerEntry, CommissionRule } from "@/types/commission";
import type { ReferralCodeHolderStatus } from "@/types/referral";

export async function getCommissionRules() {
  return listCommissionRules();
}

export async function saveCommissionRule(
  input: CreateCommissionRuleInput,
  actorUserId: string,
  ruleId?: string,
  isActive: boolean = true,
) {
  const rule = ruleId
    ? await updateCommissionRule(ruleId, { ...input, is_active: isActive })
    : await createCommissionRule(input);

  if (!rule) {
    throw new Error("Aturan komisi tidak ditemukan");
  }

  await recordAuditLog({
    actor_user_id: actorUserId,
    action: ruleId ? "COMMISSION_RULE_UPDATED" : "COMMISSION_RULE_CREATED",
    entity: "commission_rules",
    entity_id: rule.id,
    new_value: {
      commission_type: rule.commission_type,
      percentage: rule.percentage,
      flat_amount: rule.flat_amount,
      applies_to_holder_status: rule.applies_to_holder_status,
      eligible_category_id: rule.eligible_category_id,
    },
  });

  return rule;
}

export async function setCommissionRuleActive(ruleId: string, isActive: boolean, actorUserId: string) {
  const current = await findCommissionRuleById(ruleId);
  if (!current) {
    throw new Error("Aturan komisi tidak ditemukan");
  }

  const rule = await updateCommissionRule(ruleId, {
    level: current.level,
    commission_type: current.commission_type,
    percentage: current.percentage,
    flat_amount: current.flat_amount,
    applies_to_holder_status: current.applies_to_holder_status,
    min_transaction: current.min_transaction,
    min_payout: current.min_payout,
    holding_period_days: current.holding_period_days,
    eligible_category_id: current.eligible_category_id,
    max_commission: current.max_commission,
    is_active: isActive,
  });
  if (!rule) {
    throw new Error("Aturan komisi tidak ditemukan");
  }

  await recordAuditLog({
    actor_user_id: actorUserId,
    action: isActive ? "COMMISSION_RULE_ACTIVATED" : "COMMISSION_RULE_DEACTIVATED",
    entity: "commission_rules",
    entity_id: rule.id,
  });

  return rule;
}

export async function getCommissionLedger(filter: ListCommissionLedgerFilter = {}) {
  return listCommissionLedgerGlobal(filter);
}

export async function getAvailableCommissionSummary() {
  return summarizeAvailableCommissionByBeneficiary();
}

export async function getCommissionPayoutHistory() {
  return listCommissionPayouts();
}

// Picks the most specific applicable rule for this direct referral: a rule
// scoped to the transaction's own category and/or the referrer's own
// holder_status wins over a rule left NULL on either dimension (i.e.
// "applies to everything"/"applies to both statuses"). Ties broken by
// whichever candidate matches on more dimensions.
function pickRuleForDirectReferral(
  rules: CommissionRule[],
  holderStatus: ReferralCodeHolderStatus,
  categoryId: string | null,
): CommissionRule | undefined {
  const candidates = rules.filter(
    (rule) =>
      (rule.applies_to_holder_status === null || rule.applies_to_holder_status === holderStatus) &&
      (rule.eligible_category_id === null || rule.eligible_category_id === categoryId),
  );
  const specificity = (rule: CommissionRule) =>
    (rule.applies_to_holder_status !== null ? 1 : 0) + (rule.eligible_category_id !== null ? 1 : 0);
  return candidates.sort((a, b) => specificity(b) - specificity(a))[0];
}

// The Commission Engine: rewards the buyer's *direct* referrer only, never
// their referrer's referrer — DigiDes Pay deliberately has no multi-level
// payout (M18-follow-up design notes: "sistem referensi langsung, tanpa
// struktur level atau kedalaman"). Commission does NOT touch any wallet
// here — it only accrues (PENDING, becoming AVAILABLE after
// holding_period_days via settlePendingCommissions) until
// payCommissionToBeneficiary cashes it out.
export async function awardCommissionForTransaction(
  transactionId: string,
  actorUserId: string | null = null,
): Promise<CommissionLedgerEntry[]> {
  const transaction = await findTransactionById(transactionId);
  if (!transaction) {
    throw new Error("Transaksi tidak ditemukan");
  }
  if (transaction.status !== "SUCCESS") {
    throw new Error("Komisi hanya dihitung untuk transaksi berstatus SUCCESS");
  }

  const purchasingUserId = await getOwningUserId(transaction.wallet_id);
  if (!purchasingUserId) {
    return [];
  }

  const relationship = await findRelationshipByReferredUser(purchasingUserId);
  if (!relationship || relationship.status !== "ACTIVE") {
    return [];
  }

  const referrerCode = await findReferralCodeByUserId(relationship.referrer_id);
  const holderStatus: ReferralCodeHolderStatus = referrerCode?.holder_status ?? "USER";

  const rules = await listActiveCommissionRules();
  const product = transaction.product_id ? await findProductById(transaction.product_id) : null;
  const rule = pickRuleForDirectReferral(rules, holderStatus, product?.category_id ?? null);
  if (!rule) {
    return [];
  }

  const sellingPrice = Number(transaction.selling_price);
  if (rule.min_transaction && sellingPrice < Number(rule.min_transaction)) {
    return [];
  }

  let amount = rule.commission_type === "FLAT" ? Number(rule.flat_amount) : (sellingPrice * Number(rule.percentage)) / 100;
  if (rule.max_commission) amount = Math.min(amount, Number(rule.max_commission));
  amount = Math.round(amount);
  if (amount <= 0) {
    return [];
  }

  const availableAt =
    rule.holding_period_days > 0 ? new Date(Date.now() + rule.holding_period_days * 86_400_000) : new Date();

  return withTransaction(async (client) => {
    const entry = await createCommissionLedgerEntry(
      {
        transaction_id: transaction.id,
        referral_relationship_id: relationship.id,
        beneficiary_user_id: relationship.referrer_id,
        commission_rule_id: rule.id,
        level: 1,
        amount,
        available_at: availableAt,
      },
      client,
    );

    await recordAuditLog(
      {
        actor_user_id: actorUserId,
        action: "COMMISSION_AWARDED",
        entity: "transactions",
        entity_id: transaction.id,
        new_value: { entry_id: entry.id, beneficiary_user_id: entry.beneficiary_user_id, amount: entry.amount },
      },
      client,
    );

    return [entry];
  });
}

// PENDING -> AVAILABLE once a commission's holding period has passed —
// there's no cron/job runner in this app yet, so this is triggered by an
// explicit "Proses Komisi Tertunda" action on the Ledger tab.
export async function settlePendingCommissions(actorUserId: string): Promise<number> {
  const ids = await listSettleableCommissionLedgerIds();
  if (ids.length === 0) {
    return 0;
  }

  return withTransaction(async (client) => {
    const count = await markCommissionAvailable(ids, client);
    if (count > 0) {
      await recordAuditLog(
        {
          actor_user_id: actorUserId,
          action: "COMMISSION_SETTLED",
          entity: "commission_ledger",
          entity_id: ids[0],
          new_value: { settled_ids: ids },
        },
        client,
      );
    }
    return count;
  });
}

// Cashes out every AVAILABLE commission_ledger entry a beneficiary has
// into their own wallet — a direct, admin-authoritative action (same
// shape as sendTopupToMitra), always via postLedgerEntry(type="COMMISSION")
// so the credit is ledgered, never a raw balance write.
export async function payCommissionToBeneficiary(beneficiaryUserId: string, actorUserId: string) {
  const availableEntries = await listCommissionLedgerForBeneficiary(beneficiaryUserId, "AVAILABLE");
  const total = availableEntries.reduce((sum, entry) => sum + Number(entry.amount), 0);
  if (total <= 0) {
    throw new Error("Tidak ada komisi yang tersedia untuk dibayarkan");
  }

  const wallet = await getWalletByOwningUserId(beneficiaryUserId);
  if (!wallet) {
    throw new Error("Wallet penerima komisi tidak ditemukan");
  }

  return withTransaction(async (client) => {
    const payout = await createCommissionPayout(beneficiaryUserId, total, client);

    const { wallet: updatedWallet, ledgerEntry } = await postLedgerEntry(client, {
      walletId: wallet.id,
      type: "COMMISSION",
      amount: total,
      channel: "ADMIN",
      reference: payout.id,
      createdBy: actorUserId,
    });

    const paidCount = await markCommissionLedgerPaid(
      availableEntries.map((entry) => entry.id),
      client,
    );
    if (paidCount !== availableEntries.length) {
      throw new Error("Sebagian komisi sudah diproses oleh proses lain, silakan coba lagi.");
    }

    const paidPayout = await markCommissionPayoutStatus(payout.id, "PAID", ledgerEntry.id, client);

    await recordAuditLog(
      {
        actor_user_id: actorUserId,
        action: "COMMISSION_PAID",
        entity: "commission_payouts",
        entity_id: payout.id,
        new_value: { beneficiary_user_id: beneficiaryUserId, amount: total, ledger_entry_id: ledgerEntry.id },
      },
      client,
    );

    return { payout: paidPayout ?? payout, wallet: updatedWallet, ledgerEntry };
  });
}
