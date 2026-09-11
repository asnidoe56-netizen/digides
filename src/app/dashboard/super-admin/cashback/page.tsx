import { PageHeader } from "@/components/page-header";
import { CashbackRuleFormDialog, CashbackRuleList } from "@/features/cashback";
import { formatMoney } from "@/lib/formatting/money";
import { listCashbackProductOptions, listCashbackRulesWithTargets } from "@/repositories/cashback.repository";
import { listBrands, listCategories } from "@/repositories/product.repository";
import { getCashbackTotals } from "@/services/cashback.service";

// Aturan dan jumlah yang sudah terbayar berubah pada setiap transaksi —
// tidak pernah di-cache, sama seperti halaman Markup dan Komisi.
export const dynamic = "force-dynamic";

function startOfMonth(now: Date): Date {
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

export default async function SuperAdminCashbackPage() {
  const now = new Date();
  const [rules, products, categories, brands, allTime, thisMonth] = await Promise.all([
    listCashbackRulesWithTargets(),
    listCashbackProductOptions(),
    listCategories(),
    listBrands(),
    getCashbackTotals(),
    getCashbackTotals({ from: startOfMonth(now) }),
  ]);

  const activeCount = rules.filter(
    (rule) => rule.is_active && (!rule.effective_until || new Date(rule.effective_until) > now),
  ).length;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Cashback"
        description="Mitra membayar harga normal, lalu sebagian kembali ke saldonya begitu transaksi berhasil."
        actions={
          <CashbackRuleFormDialog
            products={products}
            categories={categories.map((category) => ({
              id: category.id,
              name: category.display_name ?? category.name,
            }))}
            brands={brands.map((brand) => ({ id: brand.id, name: brand.name }))}
          />
        }
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-lg border p-4">
          <p className="text-xs text-muted-foreground">Aturan aktif</p>
          <p className="mt-1 text-2xl font-bold tabular-nums">{activeCount}</p>
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-xs text-muted-foreground">Cashback bulan ini</p>
          <p className="mt-1 text-2xl font-bold tabular-nums">{formatMoney(thisMonth.totalAmount)}</p>
          <p className="text-xs text-muted-foreground">{thisMonth.entryCount} transaksi</p>
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-xs text-muted-foreground">Total sejak awal</p>
          <p className="mt-1 text-2xl font-bold tabular-nums">{formatMoney(allTime.totalAmount)}</p>
          <p className="text-xs text-muted-foreground">{allTime.entryCount} transaksi</p>
        </div>
      </div>

      <div className="rounded-lg border bg-muted/40 p-4 text-sm text-muted-foreground">
        Cashback selalu dihitung <strong className="text-foreground">sesudah komisi</strong> dan hanya
        mengambil sisa margin. Kalau cashback yang Anda pasang lebih besar dari sisa itu, yang
        terbayar otomatis dipotong — Digides tidak pernah rugi karena cashback. Formulir menunjukkan
        angka yang benar-benar terbayar sebelum Anda menyimpan.
      </div>

      <CashbackRuleList rules={rules} />
    </div>
  );
}
