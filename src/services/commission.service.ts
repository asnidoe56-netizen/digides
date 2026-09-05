import { withTransaction } from "@/lib/db/transaction";
import { recordAuditLog } from "@/repositories/audit.repository";
import {
  createCommissionLedgerEntry,
  createCommissionPayout,
  createCommissionRule,
  deactivateUniversalCommissionRuleForCategory,
  findActiveCommissionRuleByCategoryAndHolderStatus,
  findCommissionRuleById,
  getCommissionSettings as getCommissionSettingsRow,
  listActiveCommissionRules,
  listCommissionLedgerForBeneficiary,
  listCommissionLedgerForBeneficiaryDetail,
  listCommissionLedgerGlobal,
  listCommissionPayouts,
  listCommissionRules,
  listSettleableCommissionLedgerIds,
  markCommissionAutoRunMonth,
  markCommissionAvailable,
  markCommissionLedgerPaid,
  markCommissionPayoutStatus,
  summarizeAvailableCommissionByBeneficiary,
  summarizeCommissionForBeneficiary,
  updateCommissionRule,
  updateCommissionSettings,
  type ListCommissionLedgerFilter,
} from "@/repositories/commission.repository";
import { findProductById } from "@/repositories/product.repository";
import { findRelationshipByReferredUser, findReferralCodeByUserId } from "@/repositories/referral.repository";
import { findTransactionById } from "@/repositories/transaction.repository";
import { getOwningUserId, getWalletByOwningUserId, postLedgerEntry } from "@/repositories/wallet.repository";
import type { CommissionLedgerEntry, CommissionRule, CommissionType } from "@/types/commission";
import type { ReferralCodeHolderStatus } from "@/types/referral";

export async function getCommissionRules() {
  return listCommissionRules();
}

export interface SaveCommissionRuleForCategoryInput {
  eligibleCategoryId: string | null;
  commissionType: CommissionType;
  /** Reward a direct downline's transaction pays this category's USER-tier
   *  referrer — null/0 means USER referrers earn nothing for this category. */
  userAmount: number | null;
  /** Same, for MITRA-tier referrers. */
  mitraAmount: number | null;
  minTransaction: number | null;
  maxCommission: number | null;
  minPayout: number;
  holdingPeriodDays: number;
}

// The Aturan tab's editor — one form sets both tiers' reward for one
// category at once, rather than an admin having to create two separate
// rules and keep their shared fields (holding period, min/max) in sync by
// hand. Superseding a pre-existing NULL-holder_status ("applies to both")
// legacy rule for this category is intentional: see
// deactivateUniversalCommissionRuleForCategory.
export async function saveCommissionRuleForCategory(
  input: SaveCommissionRuleForCategoryInput,
  actorUserId: string,
) {
  const shared = {
    level: 1,
    commission_type: input.commissionType,
    min_transaction: input.minTransaction,
    min_payout: input.minPayout,
    holding_period_days: input.holdingPeriodDays,
    eligible_category_id: input.eligibleCategoryId,
    max_commission: input.maxCommission,
  };

  return withTransaction(async (client) => {
    await deactivateUniversalCommissionRuleForCategory(input.eligibleCategoryId, client);

    async function saveTier(holderStatus: ReferralCodeHolderStatus, amount: number | null): Promise<CommissionRule | null> {
      const existing = await findActiveCommissionRuleByCategoryAndHolderStatus(input.eligibleCategoryId, holderStatus, client);
      const hasAmount = amount != null && amount > 0;

      if (!hasAmount) {
        if (!existing) return null;
        // Deactivating only — the amount fields must stay whatever they
        // already were (never re-derived from the form's, possibly just
        // changed, commissionType), or a PERCENTAGE row could end up with
        // a non-null flat_amount/null percentage and trip the
        // commission_rules_amount_matches_type CHECK constraint.
        return updateCommissionRule(
          existing.id,
          {
            level: shared.level,
            commission_type: existing.commission_type,
            percentage: existing.percentage,
            flat_amount: existing.flat_amount,
            applies_to_holder_status: holderStatus,
            min_transaction: shared.min_transaction,
            min_payout: shared.min_payout,
            holding_period_days: shared.holding_period_days,
            eligible_category_id: shared.eligible_category_id,
            max_commission: shared.max_commission,
            is_active: false,
          },
          client,
        );
      }

      const amountFields =
        input.commissionType === "FLAT" ? { percentage: null, flat_amount: amount } : { percentage: amount, flat_amount: null };

      if (existing) {
        return updateCommissionRule(
          existing.id,
          { ...shared, ...amountFields, applies_to_holder_status: holderStatus, is_active: true },
          client,
        );
      }
      return createCommissionRule({ ...shared, ...amountFields, applies_to_holder_status: holderStatus }, client);
    }

    // Sequential, not Promise.all — both calls share one `client`, and a
    // pooled connection can't run two queries concurrently on it.
    const userRule = await saveTier("USER", input.userAmount);
    const mitraRule = await saveTier("MITRA", input.mitraAmount);

    const loggedEntityId = userRule?.id ?? mitraRule?.id;
    if (loggedEntityId) {
      await recordAuditLog(
        {
          actor_user_id: actorUserId,
          action: "COMMISSION_RULE_SAVED",
          entity: "commission_rules",
          entity_id: loggedEntityId,
          new_value: {
            eligible_category_id: input.eligibleCategoryId,
            commission_type: input.commissionType,
            user_amount: input.userAmount,
            mitra_amount: input.mitraAmount,
          },
        },
        client,
      );
    }

    return { userRule, mitraRule };
  });
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

export interface MyCommissionOverview {
  summary: { pending: string; available: string; paid: string };
  entries: Awaited<ReturnType<typeof listCommissionLedgerForBeneficiaryDetail>>;
}

// Menu Mitra's own "Komisi" tab (Flutter's ReferralScreen and, eventually,
// the web's mitra-facing Menu Mitra pages) — self-service, no SUPER_ADMIN
// role required, scoped entirely to the caller's own beneficiary_user_id.
export async function getMyCommissionOverview(userId: string): Promise<MyCommissionOverview> {
  const [entries, totals] = await Promise.all([
    listCommissionLedgerForBeneficiaryDetail(userId),
    summarizeCommissionForBeneficiary(userId),
  ]);

  const totalFor = (status: string) => totals.find((row) => row.status === status)?.total ?? "0";

  return {
    summary: {
      pending: totalFor("PENDING"),
      available: totalFor("AVAILABLE"),
      paid: totalFor("PAID"),
    },
    entries,
  };
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
// triggered either by an explicit "Proses Komisi Tertunda"/"Proses Bulan
// Ini" admin action (actorUserId set) or by the unattended monthly job
// (actorUserId null, same convention as pending-transaction-check).
export async function settlePendingCommissions(actorUserId: string | null): Promise<number> {
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
// into their own wallet, always via postLedgerEntry(type="COMMISSION") so
// the credit is ledgered, never a raw balance write. actorUserId is null
// for the unattended monthly job, matching settlePendingCommissions.
export async function payCommissionToBeneficiary(beneficiaryUserId: string, actorUserId: string | null) {
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
      channel: actorUserId ? "ADMIN" : "SYSTEM",
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

export async function getCommissionSettings() {
  return getCommissionSettingsRow();
}

export interface SetCommissionAutoPayoutInput {
  autoPayoutEnabled: boolean;
  payoutDayOfMonth: number;
}

export async function setCommissionAutoPayout(input: SetCommissionAutoPayoutInput, actorUserId: string) {
  const current = await getCommissionSettingsRow();
  const settings = await updateCommissionSettings(
    current.id,
    { auto_payout_enabled: input.autoPayoutEnabled, payout_day_of_month: input.payoutDayOfMonth },
    actorUserId,
  );

  await recordAuditLog({
    actor_user_id: actorUserId,
    action: input.autoPayoutEnabled ? "COMMISSION_AUTO_PAYOUT_ENABLED" : "COMMISSION_AUTO_PAYOUT_DISABLED",
    entity: "commission_settings",
    entity_id: settings.id,
    new_value: { payout_day_of_month: input.payoutDayOfMonth },
  });

  return settings;
}

export interface MonthlyCommissionPayoutSummary {
  settledCount: number;
  paidBeneficiaryCount: number;
  totalPaidAmount: number;
  errors: number;
}

// The full monthly cycle: PENDING -> AVAILABLE for anything whose holding
// period has passed, then AVAILABLE -> PAID (credited to each
// beneficiary's own wallet) for everyone who has something to cash out.
// Reuses settlePendingCommissions/payCommissionToBeneficiary verbatim —
// this is pure orchestration, no new money-movement logic — so it's safe
// to call both from an explicit admin click (actorUserId set) and from the
// unattended monthly job (actorUserId null, same as
// pending-transaction-check's re-checks).
export async function runMonthlyCommissionPayout(actorUserId: string | null): Promise<MonthlyCommissionPayoutSummary> {
  const settledCount = await settlePendingCommissions(actorUserId);
  const summary = await summarizeAvailableCommissionByBeneficiary();

  let paidBeneficiaryCount = 0;
  let totalPaidAmount = 0;
  let errors = 0;

  for (const row of summary) {
    try {
      const result = await payCommissionToBeneficiary(row.beneficiary_user_id, actorUserId);
      paidBeneficiaryCount += 1;
      totalPaidAmount += Number(result.payout.amount);
    } catch (error) {
      errors += 1;
      console.error(`[monthly-commission-payout] failed for beneficiary ${row.beneficiary_user_id}:`, error);
    }
  }

  return { settledCount, paidBeneficiaryCount, totalPaidAmount, errors };
}
