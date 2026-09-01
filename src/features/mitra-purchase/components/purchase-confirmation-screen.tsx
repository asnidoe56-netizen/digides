"use client";

import { useState } from "react";
import { ArrowLeft, Check, Copy } from "lucide-react";
import { formatMoney } from "@/lib/formatting/money";

export interface PurchaseConfirmationScreenProps {
  categoryName: string;
  brandName: string;
  brandInitials: string;
  /** e.g. "PLN" — only set when the category has a real, verified
   *  prepaid/postpaid classification (today: PLN's page.tsx passes
   *  "Prabayar", since every synced PLN product genuinely is a prepaid
   *  token). Omitted entirely for categories with no such classification,
   *  rather than guessed. */
  productTypeLabel?: string;
  /** e.g. "Nomor Tujuan" (telco/e-money/PLN) or "ID Game" (Games). */
  customerIdLabel: string;
  customerId: string;
  /** Set only once the mitra has tapped "Verifikasi Pengguna" on the
   *  browse screen and it succeeded — never re-fetched here, reusing
   *  whatever the prior step already returned. */
  verifiedName?: string | null;
  /** Only present for meter-based utility inquiries (PLN today) — see
   *  verification.service.ts's parseRegisteredCustomer. */
  verifiedTariffPower?: string | null;
  nominalLabel: string;
  price: number;
  availableBalance: string;
  /** The transaction's own idempotency key, generated as soon as a
   *  product was picked (category-purchase-flow.tsx) — genuinely becomes
   *  the transaction's reference once "Bayar Sekarang" is confirmed, not
   *  a placeholder. Shown here labeled as pending, never implying the
   *  transaction has already happened. */
  referenceId: string;
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

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1 rounded-xl border p-3">
      <p className="text-sm font-semibold">{title}</p>
      <div className="divide-y">{children}</div>
    </div>
  );
}

export function PurchaseConfirmationScreen({
  categoryName,
  brandName,
  brandInitials,
  productTypeLabel,
  customerIdLabel,
  customerId,
  verifiedName,
  verifiedTariffPower,
  nominalLabel,
  price,
  availableBalance,
  referenceId,
  onBack,
  onConfirm,
}: PurchaseConfirmationScreenProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopyCustomerId() {
    try {
      await navigator.clipboard.writeText(customerId);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard permission denied/unavailable — the id is still on
      // screen for the mitra to copy manually.
    }
  }

  const availableBalanceNumber = Number(availableBalance);
  const estimatedBalanceAfter = Number.isFinite(availableBalanceNumber) ? availableBalanceNumber - price : null;
  const transactionTime = new Intl.DateTimeFormat("id-ID", { dateStyle: "long", timeStyle: "short" }).format(
    new Date(),
  );

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

      <div className="flex flex-1 flex-col gap-4 p-4 pb-28">
        <p className="font-semibold">Detail Transaksi</p>

        <div className="flex items-center gap-3 rounded-xl border p-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-red-50 text-xs font-bold text-red-600">
            {brandInitials}
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-medium">{brandName}</p>
            <p className="text-xs text-muted-foreground">{categoryName}</p>
          </div>
          {productTypeLabel ? (
            <span className="shrink-0 rounded-full bg-status-success px-2.5 py-1 text-xs font-medium text-status-success-foreground">
              {productTypeLabel}
            </span>
          ) : null}
        </div>

        <SectionCard title="Informasi Pelanggan">
          <div className="flex items-center justify-between py-2">
            <div className="min-w-0">
              <p className="text-sm text-muted-foreground">{customerIdLabel}</p>
              <p className="font-medium">{customerId}</p>
            </div>
            <button
              type="button"
              onClick={handleCopyCustomerId}
              className="flex shrink-0 items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted"
            >
              {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
              {copied ? "Tersalin" : "Salin"}
            </button>
          </div>
          {verifiedName ? <DetailRow label="Nama Pelanggan" value={verifiedName} /> : null}
          {verifiedTariffPower ? <DetailRow label="Tarif / Daya" value={verifiedTariffPower} /> : null}
        </SectionCard>

        <p className="rounded-lg bg-amber-50 p-3 text-xs text-amber-800">
          Pastikan {customerIdLabel.toLowerCase()} sudah benar sebelum melakukan pembayaran.
        </p>

        <SectionCard title="Rincian Pembayaran">
          <DetailRow label="Nominal" value={nominalLabel} />
          <DetailRow label="Harga" value={formatMoney(price)} />
          <DetailRow label="Total Bayar" value={formatMoney(price)} bold />
        </SectionCard>

        <SectionCard title="Rincian Transaksi">
          <DetailRow label="No. Referensi" value={referenceId} />
          <DetailRow label="Waktu" value={transactionTime} />
          <DetailRow label="Metode Pembayaran" value="Saldo Digides" />
          <DetailRow label="Saldo Tersedia" value={formatMoney(availableBalance)} />
          {estimatedBalanceAfter !== null ? (
            <DetailRow label="Estimasi Saldo Setelah" value={formatMoney(estimatedBalanceAfter)} />
          ) : null}
          <div className="flex items-center justify-between py-2">
            <span className="text-sm text-muted-foreground">Status</span>
            <span className="rounded-full bg-status-pending px-2.5 py-1 text-xs font-medium text-status-pending-foreground">
              Menunggu Pembayaran
            </span>
          </div>
        </SectionCard>

        <p className="rounded-lg bg-muted p-3 text-center text-xs text-muted-foreground">
          Saldo akan ditahan sementara dan otomatis dikembalikan jika transaksi gagal.
        </p>
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
