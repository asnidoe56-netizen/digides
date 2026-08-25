import { Pencil } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/empty-state";
import { MoneyDisplay } from "@/components/money-display";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { Category } from "@/types/product";
import type { CommissionRule } from "@/types/commission";
import { CommissionRuleFormDialog } from "./commission-rule-form-dialog";
import { CommissionRuleStatusToggle } from "./commission-rule-status-toggle";

export interface CommissionRuleListProps {
  rules: CommissionRule[];
  categories: Category[];
}

export function CommissionRuleList({ rules, categories }: CommissionRuleListProps) {
  if (rules.length === 0) {
    return (
      <EmptyState
        title="Belum ada aturan komisi"
        description='Klik "Tambah Aturan" untuk menentukan persentase komisi per level referral.'
      />
    );
  }

  const categoryNameById = new Map(categories.map((category) => [category.id, category.name]));

  return (
    <>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:hidden">
        {rules.map((rule) => (
          <div key={rule.id} className="flex flex-col gap-3 rounded-lg border p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-medium">Level {rule.level}</p>
                <p className="text-sm text-muted-foreground">
                  {rule.eligible_category_id ? (categoryNameById.get(rule.eligible_category_id) ?? "-") : "Semua Kategori"}
                </p>
              </div>
              <Badge variant={rule.is_active ? "default" : "outline"}>{rule.is_active ? "Aktif" : "Nonaktif"}</Badge>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Persentase</p>
                <p className="font-medium">{rule.percentage}%</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Holding Period</p>
                <p className="font-medium">{rule.holding_period_days} hari</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Min. Payout</p>
                <MoneyDisplay amount={rule.min_payout} size="sm" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Maks. Komisi</p>
                {rule.max_commission ? <MoneyDisplay amount={rule.max_commission} size="sm" /> : <p>-</p>}
              </div>
            </div>
            <div className="flex gap-2">
              <CommissionRuleFormDialog
                categories={categories}
                rule={rule}
                trigger={
                  <Button type="button" variant="outline" size="sm" className="h-9 flex-1 gap-2">
                    <Pencil className="size-3.5" />
                    Ubah
                  </Button>
                }
              />
              <CommissionRuleStatusToggle rule={rule} />
            </div>
          </div>
        ))}
      </div>

      <div className="hidden overflow-x-auto rounded-lg border lg:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Level</TableHead>
              <TableHead>Kategori</TableHead>
              <TableHead className="text-right">Persentase</TableHead>
              <TableHead className="text-right">Min. Payout</TableHead>
              <TableHead className="text-right">Maks. Komisi</TableHead>
              <TableHead>Holding</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-px" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rules.map((rule) => (
              <TableRow key={rule.id}>
                <TableCell className="font-medium">{rule.level}</TableCell>
                <TableCell className="text-muted-foreground">
                  {rule.eligible_category_id ? (categoryNameById.get(rule.eligible_category_id) ?? "-") : "Semua Kategori"}
                </TableCell>
                <TableCell className="text-right">{rule.percentage}%</TableCell>
                <TableCell className="text-right">
                  <MoneyDisplay amount={rule.min_payout} size="sm" />
                </TableCell>
                <TableCell className="text-right">
                  {rule.max_commission ? <MoneyDisplay amount={rule.max_commission} size="sm" /> : "-"}
                </TableCell>
                <TableCell className="text-muted-foreground">{rule.holding_period_days} hari</TableCell>
                <TableCell>
                  <Badge variant={rule.is_active ? "default" : "outline"}>{rule.is_active ? "Aktif" : "Nonaktif"}</Badge>
                </TableCell>
                <TableCell>
                  <div className="flex justify-end gap-2">
                    <CommissionRuleFormDialog
                      categories={categories}
                      rule={rule}
                      trigger={
                        <Button type="button" variant="outline" size="sm" className="h-9 gap-2">
                          <Pencil className="size-3.5" />
                          Ubah
                        </Button>
                      }
                    />
                    <CommissionRuleStatusToggle rule={rule} />
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
