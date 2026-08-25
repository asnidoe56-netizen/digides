"use client";

import { useState } from "react";
import { ChevronRight, Eye, EyeOff, Plus } from "lucide-react";
import { formatMoney } from "@/lib/formatting/money";
import { MitraHeader } from "./mitra-header";

export interface WalletSummaryCardProps {
  fullName: string;
  roleLabel: string;
  availableBalance: string;
  heldBalance: string;
}

// available_balance / held_balance are the two real numbers wallets.ts
// already tracks (see src/types/wallet.ts) — shown here instead of a
// fabricated "saldo utama / saldo bonus" split that doesn't exist in the
// schema. Held balance is money reserved against an in-flight transaction,
// not a bonus.
export function WalletSummaryCard({ fullName, roleLabel, availableBalance, heldBalance }: WalletSummaryCardProps) {
  const [visible, setVisible] = useState(true);
  const total = Number(availableBalance) + Number(heldBalance);

  return (
    <div className="flex flex-col gap-4 rounded-b-3xl bg-gradient-to-br from-red-500 to-red-700 px-4 pt-4 pb-6 sm:rounded-3xl sm:pb-4">
      <MitraHeader fullName={fullName} roleLabel={roleLabel} />

      <div className="flex items-start justify-between gap-3 rounded-2xl bg-white/10 p-4 text-white backdrop-blur-sm">
        <div className="min-w-0">
          <p className="text-xs text-white/80">Saldo Wallet</p>
          <div className="mt-1 flex items-center gap-2">
            <p className="text-2xl font-bold">{visible ? formatMoney(total) : "Rp••••••"}</p>
            <button
              type="button"
              onClick={() => setVisible((prev) => !prev)}
              aria-label={visible ? "Sembunyikan saldo" : "Tampilkan saldo"}
              className="text-white/80 hover:text-white"
            >
              {visible ? <Eye className="size-4" /> : <EyeOff className="size-4" />}
            </button>
          </div>
        </div>

        <button
          type="button"
          disabled
          title="Segera hadir"
          aria-label="Isi saldo"
          className="flex size-10 shrink-0 items-center justify-center rounded-full bg-white text-red-600"
        >
          <Plus className="size-5" />
        </button>
      </div>

      <button type="button" disabled title="Segera hadir" className="flex items-center justify-between text-white">
        <div className="flex gap-6 text-left">
          <div>
            <p className="text-xs text-white/80">Saldo Tersedia</p>
            <p className="text-sm font-semibold">{visible ? formatMoney(availableBalance) : "Rp••••••"}</p>
          </div>
          <div>
            <p className="text-xs text-white/80">Saldo Tertahan</p>
            <p className="text-sm font-semibold">{visible ? formatMoney(heldBalance) : "Rp••••••"}</p>
          </div>
        </div>
        <ChevronRight className="size-4 text-white/70" />
      </button>
    </div>
  );
}
