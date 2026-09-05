import { Pencil } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/empty-state";
import { MoneyDisplay } from "@/components/money-display";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { Category } from "@/types/product";
import type { CommissionRule } from "@/types/commission";
import { CommissionRuleFormDialog } from "./commission-rule-form-dialog";
import { CommissionRulePairStatusToggle } from "./commission-rule-pair-status-toggle";

export interface CommissionRuleListProps {
  rules: CommissionRule[];
  categories: Category[];
}

interface CategoryRulePair {
  categoryId: string | null;
  categoryLabel: string;
  userRule?: CommissionRule;
  mitraRule?: CommissionRule;
  allRuleIds: string[];
  isActive: boolean;
}

// Groups the flat commission_rules list by category — the Aturan tab
// presents "one category = one setting with two nominals" (see
// CommissionRuleFormDialog), even though under the hood it's still up to
// two rows (plus, for a category nobody has touched since this UI existed,
// a third legacy row with applies_to_holder_status = NULL — pre-filled
// into both tiers so editing it splits it into the new shape).
function groupByCategoryLabel(rules: CommissionRule[], categoryNameById: Map<string, string>): CategoryRulePair[] {
  const groups = new Map<string, CommissionRule[]>();
  for (const rule of rules) {
    const key = rule.eligible_category_id ?? "GLOBAL";
    groups.set(key, [...(groups.get(key) ?? []), rule]);
  }

  return Array.from(groups.entries()).map(([key, groupRules]) => {
    const categoryId = key === "GLOBAL" ? null : key;
    const userRule = groupRules.find((r) => r.applies_to_holder_status === "USER" && r.is_active) ?? groupRules.find((r) => r.applies_to_holder_status === "USER");
    const mitraRule = groupRules.find((r) => r.applies_to_holder_status === "MITRA" && r.is_active) ?? groupRules.find((r) => r.applies_to_holder_status === "MITRA");
    const legacyRule = groupRules.find((r) => r.applies_to_holder_status === null);

    return {
      categoryId,
      categoryLabel: categoryId ? (categoryNameById.get(categoryId) ?? "-") : "Semua Kategori",
      userRule: userRule ?? legacyRule,
      mitraRule: mitraRule ?? legacyRule,
      allRuleIds: groupRules.map((r) => r.id),
      isActive: groupRules.some((r) => r.is_active),
    };
  });
}

function amountLabel(rule?: CommissionRule): string {
  if (!rule) return "-";
  return rule.commission_type === "FLAT"
    ? `Rp${Number(rule.flat_amount).toLocaleString("id-ID")}`
    : `${rule.percentage}%`;
}

export function CommissionRuleList({ rules, categories }: CommissionRuleListProps) {
  if (rules.length === 0) {
    return (
      <EmptyState
        title="Belum ada aturan komisi"
        description='Klik "Tambah Aturan" untuk menentukan reward per transaksi downline, per status pereferensi (User Biasa/Mitra).'
      />
    );
  }

  const categoryNameById = new Map(categories.map((category) => [category.id, category.name]));
  const pairs = groupByCategoryLabel(rules, categoryNameById);

  return (
    <>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:hidden">
        {pairs.map((pair) => (
          <div key={pair.categoryId ?? "GLOBAL"} className="flex flex-col gap-3 rounded-lg border p-4">
            <div className="flex items-start justify-between gap-3">
              <p className="font-medium">{pair.categoryLabel}</p>
              <Badge variant={pair.isActive ? "default" : "outline"}>{pair.isActive ? "Aktif" : "Nonaktif"}</Badge>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">User Biasa</p>
                <p className="font-medium">{amountLabel(pair.userRule)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Mitra</p>
                <p className="font-medium">{amountLabel(pair.mitraRule)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Min. Payout</p>
                <MoneyDisplay amount={(pair.userRule ?? pair.mitraRule)?.min_payout ?? "0"} size="sm" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Holding</p>
                <p className="font-medium">{(pair.userRule ?? pair.mitraRule)?.holding_period_days ?? 0} hari</p>
              </div>
            </div>
            <div className="flex gap-2">
              <CommissionRuleFormDialog
                categories={categories}
                userRule={pair.userRule}
                mitraRule={pair.mitraRule}
                trigger={
                  <Button type="button" variant="outline" size="sm" className="h-9 flex-1 gap-2">
                    <Pencil className="size-3.5" />
                    Ubah
                  </Button>
                }
              />
              <CommissionRulePairStatusToggle
                ruleIds={pair.allRuleIds}
                categoryLabel={pair.categoryLabel}
                isActive={pair.isActive}
              />
            </div>
          </div>
        ))}
      </div>

      <div className="hidden overflow-x-auto rounded-lg border lg:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Kategori</TableHead>
              <TableHead className="text-right">Reward User Biasa</TableHead>
              <TableHead className="text-right">Reward Mitra</TableHead>
              <TableHead className="text-right">Min. Payout</TableHead>
              <TableHead>Holding</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-px" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {pairs.map((pair) => (
              <TableRow key={pair.categoryId ?? "GLOBAL"}>
                <TableCell className="font-medium">{pair.categoryLabel}</TableCell>
                <TableCell className="text-right">{amountLabel(pair.userRule)}</TableCell>
                <TableCell className="text-right">{amountLabel(pair.mitraRule)}</TableCell>
                <TableCell className="text-right">
                  <MoneyDisplay amount={(pair.userRule ?? pair.mitraRule)?.min_payout ?? "0"} size="sm" />
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {(pair.userRule ?? pair.mitraRule)?.holding_period_days ?? 0} hari
                </TableCell>
                <TableCell>
                  <Badge variant={pair.isActive ? "default" : "outline"}>{pair.isActive ? "Aktif" : "Nonaktif"}</Badge>
                </TableCell>
                <TableCell>
                  <div className="flex justify-end gap-2">
                    <CommissionRuleFormDialog
                      categories={categories}
                      userRule={pair.userRule}
                      mitraRule={pair.mitraRule}
                      trigger={
                        <Button type="button" variant="outline" size="sm" className="h-9 gap-2">
                          <Pencil className="size-3.5" />
                          Ubah
                        </Button>
                      }
                    />
                    <CommissionRulePairStatusToggle
                      ruleIds={pair.allRuleIds}
                      categoryLabel={pair.categoryLabel}
                      isActive={pair.isActive}
                    />
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  );
}
