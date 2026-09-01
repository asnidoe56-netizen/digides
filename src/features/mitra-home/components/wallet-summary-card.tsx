"use client";

import { useState } from "react";
import { ChevronRight, Eye, EyeOff, Plus, RefreshCw } from "lucide-react";
import { formatMoney } from "@/lib/formatting/money";
import { getMyWalletBalance } from "../services/wallet-api";
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
export function WalletSummaryCard({
  fullName,
  roleLabel,
  availableBalance: initialAvailableBalance,
  heldBalance: initialHeldBalance,
}: WalletSummaryCardProps) {
  const [visible, setVisible] = useState(true);
  const [availableBalance, setAvailableBalance] = useState(initialAvailableBalance);
  const [heldBalance, setHeldBalance] = useState(initialHeldBalance);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const total = Number(availableBalance) + Number(heldBalance);

  // Re-reads the wallet fresh from the server (GET /api/wallet/me) — never
  // recomputed client-side — so the number on screen can never drift from
  // what a purchase would actually charge against.
  async function handleRefresh() {
    if (isRefreshing) return;
    setIsRefreshing(true);
    try {
      const balance = await getMyWalletBalance();
      setAvailableBalance(balance.availableBalance);
      setHeldBalance(balance.heldBalance);
    } catch {
      // Transient network/server hiccup — leave the last-known balance on
      // screen rather than blanking it out; the mitra can just tap again.
    } finally {
      setIsRefreshing(false);
    }
  }

  return (
    <div className="sticky top-0 z-20 flex flex-col gap-4 rounded-b-3xl bg-linear-to-br from-red-500 to-red-700 px-4 pt-4 pb-6 sm:rounded-3xl sm:pb-4">
      <MitraHeader fullName={fullName} roleLabel={roleLabel} />

      <div className="flex items-start justify-between gap-3 rounded-2xl bg-white/10 p-4 text-white backdrop-blur-sm">
        <div className="min-w-0">
          <p className="text-xs text-white/80">Saldo Wallet</p>
          {/* flex + gap, not absolute positioning — the eye/refresh
              buttons sit right after the number and simply get pushed
              further along as the balance grows more digits, so they
              never overlap it. */}
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <p className="text-2xl font-bold">{visible ? formatMoney(total) : "Rp••••••"}</p>
            <button
              type="button"
              onClick={() => setVisible((prev) => !prev)}
              aria-label={visible ? "Sembunyikan saldo" : "Tampilkan saldo"}
              className="shrink-0 text-white/80 hover:text-white"
            >
              {visible ? <Eye className="size-4" /> : <EyeOff className="size-4" />}
            </button>
            <button
              type="button"
              onClick={handleRefresh}
              disabled={isRefreshing}
              aria-label="Refresh saldo"
              title="Refresh saldo"
              className="shrink-0 text-white/80 hover:text-white disabled:opacity-60"
            >
              <RefreshCw className={`size-4 ${isRefreshing ? "animate-spin" : ""}`} />
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
