import { ArrowLeft } from "lucide-react";
import { formatMoney } from "@/lib/formatting/money";

export interface PurchaseConfirmationScreenProps {
  categoryName: string;
  brandName: string;
  brandInitials: string;
  /** e.g. "Nomor Tujuan" (telco/e-money/PLN) or "ID Game" (Games). */
  customerIdLabel: string;
  customerId: string;
  nominalLabel: string;
  price: number;
  availableBalance: string;
  onBack: () => void;
  onConfirm: () => void;
}

function DetailRow({ label, value, bold = false }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex items-center justify-between py-2">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className={bold ? "font-semibold" : "text-sm font-medium"}>{value}</span>
    </div>
  );
}

export function PurchaseConfirmationScreen({
  categoryName,
  brandName,
  brandInitials,
  customerIdLabel,
  customerId,
  nominalLabel,
  price,
  availableBalance,
  onBack,
  onConfirm,
}: PurchaseConfirmationScreenProps) {
  return (
    <div className="flex flex-1 flex-col">
      <header className="flex items-center gap-3 bg-red-600 px-4 py-3 text-white">
        <button
          type="button"
          onClick={onBack}
          aria-label="Kembali"
          className="flex size-8 items-center justify-center rounded-full hover:bg-white/10"
        >
          <ArrowLeft className="size-5" />
        </button>
        <h1 className="font-semibold">Konfirmasi</h1>
      </header>

      <div className="flex flex-1 flex-col gap-4 p-4 pb-24">
        <p className="font-semibold">Detail Transaksi</p>

        <div className="flex items-center gap-3 rounded-xl border p-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-red-50 text-xs font-bold text-red-600">
            {brandInitials}
          </span>
          <div>
            <p className="font-medium">{brandName}</p>
            <p className="text-xs text-muted-foreground">{categoryName}</p>
          </div>
        </div>

        <div className="divide-y rounded-xl border px-3">
          <DetailRow label={customerIdLabel} value={customerId} />
          <DetailRow label="Nominal" value={nominalLabel} />
          <DetailRow label="Harga" value={formatMoney(price)} />
          <DetailRow label="Saldo Tersedia" value={formatMoney(availableBalance)} />
          <DetailRow label="Total Bayar" value={formatMoney(price)} bold />
        </div>
      </div>

      {/* bottom-16, not bottom-0 — stacks above the global MitraBottomNav
          (layout.tsx), which already occupies the bottom 4rem (h-16) on
          every page. */}
      <div className="fixed inset-x-0 bottom-16 z-30 mx-auto max-w-lg border-t bg-background p-4">
        <button
          type="button"
          onClick={onConfirm}
          className="w-full rounded-full bg-red-600 py-3 text-center font-semibold text-white"
        >
          Bayar Sekarang
        </button>
      </div>
    </div>
  );
}
