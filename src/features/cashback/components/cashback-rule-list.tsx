import { EmptyState } from "@/components/empty-state";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatMoney } from "@/lib/formatting/money";
import type { CashbackRuleWithTarget } from "@/repositories/cashback.repository";
import { CashbackRuleToggle } from "./cashback-rule-toggle";

const SCOPE_LABEL: Record<CashbackRuleWithTarget["scope_type"], string> = {
  PRODUCT: "Produk",
  BRAND: "Brand",
  CATEGORY: "Kategori",
  GLOBAL: "Semua produk",
};

const dateFormatter = new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", year: "numeric" });

function describeValue(rule: CashbackRuleWithTarget): string {
  const value = Number(rule.cashback_value);
  const base = rule.cashback_type === "NOMINAL" ? formatMoney(value) : `${value}% dari margin`;
  const max = Number(rule.max_cashback ?? 0);
  return max > 0 ? `${base}, maks ${formatMoney(max)}` : base;
}

// Status yang dibaca manusia, termasuk yang sering terlewat: aturan yang
// is_active = true tapi sudah lewat masa berlakunya. Menampilkannya
// "Aktif" akan membuat admin bingung kenapa tidak ada yang terbayar.
function describeStatus(rule: CashbackRuleWithTarget): { label: string; tone: "on" | "off" | "expired" } {
  if (!rule.is_active) return { label: "Nonaktif", tone: "off" };
  if (rule.effective_until && new Date(rule.effective_until) <= new Date()) {
    return { label: "Kedaluwarsa", tone: "expired" };
  }
  return { label: "Aktif", tone: "on" };
}

const TONE_CLASS = {
  on: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
  off: "bg-muted text-muted-foreground",
  expired: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
};

export function CashbackRuleList({ rules }: { rules: CashbackRuleWithTarget[] }) {
  if (rules.length === 0) {
    return (
      <EmptyState
        title="Belum ada aturan cashback"
        description="Tekan Tambah Cashback untuk memberi cashback pada satu produk, brand, atau kategori."
      />
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Berlaku untuk</TableHead>
            <TableHead>Cashback</TableHead>
            <TableHead>Masa berlaku</TableHead>
            <TableHead className="text-right">Sudah dibayar</TableHead>
            <TableHead>Status</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {rules.map((rule) => {
            const status = describeStatus(rule);
            const label = rule.target_name ?? "semua produk";
            return (
              <TableRow key={rule.id}>
                <TableCell>
                  <p className="font-medium">{rule.target_name ?? "Semua produk"}</p>
                  <p className="text-xs text-muted-foreground">
                    {SCOPE_LABEL[rule.scope_type]}
                    {rule.product_base_price ? ` · modal ${formatMoney(rule.product_base_price)}` : ""}
                  </p>
                </TableCell>
                <TableCell>
                  <p>{describeValue(rule)}</p>
                  {Number(rule.min_transaction ?? 0) > 0 ? (
                    <p className="text-xs text-muted-foreground">
                      min. transaksi {formatMoney(rule.min_transaction ?? 0)}
                    </p>
                  ) : null}
                </TableCell>
                <TableCell className="text-sm">
                  {dateFormatter.format(new Date(rule.effective_from))} –{" "}
                  {rule.effective_until ? dateFormatter.format(new Date(rule.effective_until)) : "tanpa batas"}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  <p className="font-medium">{formatMoney(rule.paid_total)}</p>
                  <p className="text-xs text-muted-foreground">{rule.paid_count}× transaksi</p>
                </TableCell>
                <TableCell>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${TONE_CLASS[status.tone]}`}>
                    {status.label}
                  </span>
                </TableCell>
                <TableCell className="text-right">
                  <CashbackRuleToggle id={rule.id} label={label} isActive={rule.is_active} />
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
