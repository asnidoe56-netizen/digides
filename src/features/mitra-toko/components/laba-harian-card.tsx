import { formatMoney } from "@/lib/formatting/money";
import { cn } from "@/lib/utils";
import type { StoreSalesReport } from "@/services/store-report.service";

// PRD Kasir Pintar §9 Tahap 4 — "pemilik warung bisa membaca untungnya
// hari itu, bukan cuma omzetnya".
//
// The whole design problem here is one sentence: omzet is easy and
// profit is honest, and the screen must never let the easy number pass
// itself off as the honest one. So when even a single item was sold
// without modal recorded, profit is not shown as a number at all — it
// says how many items are missing modal and what to do about it.
export function LabaHarianCard({ report }: { report: StoreSalesReport }) {
  const hasSales = report.totalItemsSold > 0;

  return (
    <div className="rounded-2xl border bg-card p-4">
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-xs text-muted-foreground">Penjualan hari ini</p>
        <p className="text-xs text-muted-foreground">
          {report.totalItemsSold} barang
        </p>
      </div>
      <p className="mt-1 text-2xl font-bold">{formatMoney(report.totalRevenue)}</p>

      {!hasSales ? (
        <p className="mt-2 text-xs text-muted-foreground">
          Belum ada penjualan lunas hari ini.
        </p>
      ) : report.totalProfit === null ? (
        <p className="mt-2 rounded-xl bg-muted px-3 py-2 text-xs text-muted-foreground">
          Untung belum bisa dihitung — <span className="font-medium">{report.totalItemsWithoutCost} barang</span>{" "}
          terjual tanpa modal tercatat. Isi modalnya di Kelola Produk supaya
          laporan ini lengkap.
        </p>
      ) : (
        <p className="mt-1 text-sm font-semibold text-emerald-600">
          Untung {formatMoney(report.totalProfit)}
        </p>
      )}

      {report.categories.length > 0 ? (
        <div className="mt-4 flex flex-col gap-2 border-t pt-3">
          <p className="text-xs font-medium text-muted-foreground">Per kategori</p>
          {report.categories.map((row) => (
            <div
              key={row.categoryId ?? "tanpa-kategori"}
              className="flex items-baseline justify-between gap-3 text-sm"
            >
              <span className="min-w-0 truncate">
                {/* Uncategorised sales are real money, so they get a row
                    of their own rather than vanishing from the report. */}
                {row.categoryName ?? "Tanpa kategori"}
                <span className="ml-1.5 text-xs text-muted-foreground">×{row.itemsSold}</span>
              </span>
              <span className="shrink-0 text-right">
                <span className="font-medium">{formatMoney(row.revenue)}</span>
                <span
                  className={cn(
                    "ml-2 text-xs",
                    row.profit === null ? "text-muted-foreground" : "font-medium text-emerald-600",
                  )}
                >
                  {row.profit === null
                    ? `${row.itemsWithoutCost} tanpa modal`
                    : `+${formatMoney(row.profit)}`}
                </span>
              </span>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
