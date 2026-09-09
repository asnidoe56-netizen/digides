"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowDownToLine, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ApiError } from "@/lib/api/client";
import { formatMoney } from "@/lib/formatting/money";
import { settleStoreBalance } from "../services/toko-api";

export interface SettleBalanceDialogProps {
  storeBalance: string;
  onClose: () => void;
}

// "Pindahkan ke Saldo Utama" — the only way store money reaches a PPOB
// purchase since 2026-09-09. This is not a withdrawal: it moves balance
// between two wallets the same person owns, and the store's ledger keeps
// its own row for it (STORE_SETTLEMENT_OUT) so the shop's books stay
// readable as a shop's books.
export function SettleBalanceDialog({ storeBalance, onClose }: SettleBalanceDialogProps) {
  const router = useRouter();
  const [amount, setAmount] = useState("");
  const [pin, setPin] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Regenerated whenever the amount changes, so a retry after a wrong PIN
  // reuses the same key (never a second move) while a genuinely different
  // amount gets its own — same rule Menu Transfer follows.
  const idempotencyKey = useMemo(() => crypto.randomUUID(), [amount]);

  const balance = Number(storeBalance);
  const amountNumber = Number(amount);
  const isAmountValid = Number.isInteger(amountNumber) && amountNumber > 0 && amountNumber <= balance;
  const canSubmit = isAmountValid && /^[0-9]{6}$/.test(pin) && !isSubmitting;

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!canSubmit) return;
    setIsSubmitting(true);
    setError(null);
    try {
      await settleStoreBalance({ amount: amountNumber, pin, idempotencyKey });
      onClose();
      router.refresh();
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Gagal memindahkan saldo.");
      setPin("");
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open onOpenChange={(next) => (next ? null : onClose())}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Pindahkan ke Saldo Utama</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex items-center gap-3 rounded-xl border p-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-red-50 text-red-600">
              <ArrowDownToLine className="size-5" />
            </span>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">Saldo toko tersedia</p>
              <p className="font-semibold">{formatMoney(storeBalance)}</p>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="settle-amount" className="text-sm font-medium">
              Nominal
            </label>
            <input
              id="settle-amount"
              type="number"
              inputMode="numeric"
              min={1}
              max={balance}
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              placeholder="0"
              className="rounded-xl border px-3 py-2.5 outline-none focus:border-red-600"
            />
            <div className="flex items-center justify-between">
              {amountNumber > 0 ? (
                <p className="text-xs text-muted-foreground">{formatMoney(amountNumber)}</p>
              ) : (
                <span />
              )}
              <button
                type="button"
                onClick={() => setAmount(String(Math.floor(balance)))}
                className="text-xs font-semibold text-red-600"
              >
                Pindahkan semua
              </button>
            </div>
            {amount !== "" && !isAmountValid ? (
              <p className="text-xs text-destructive">
                {amountNumber > balance ? "Melebihi saldo toko." : "Nominal tidak valid."}
              </p>
            ) : null}
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="settle-pin" className="text-sm font-medium">
              PIN Transaksi
            </label>
            <input
              id="settle-pin"
              type="password"
              inputMode="numeric"
              maxLength={6}
              value={pin}
              onChange={(event) => setPin(event.target.value.replace(/\D/g, ""))}
              placeholder="******"
              className="rounded-xl border px-3 py-2.5 tracking-[0.4em] outline-none focus:border-red-600"
            />
          </div>

          {error ? (
            <p className="rounded-xl bg-status-failed px-3 py-2.5 text-sm text-status-failed-foreground">{error}</p>
          ) : null}

          <p className="rounded-xl bg-muted px-3 py-2.5 text-xs text-muted-foreground">
            Saldo pindah ke saldo utama Anda sendiri, lalu dipakai untuk kulakan pulsa dan token seperti biasa. Ini
            bukan penarikan dana.
          </p>

          <DialogFooter>
            <button
              type="submit"
              disabled={!canSubmit}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-red-600 px-4 py-3 font-semibold text-white hover:bg-red-700 disabled:opacity-50"
            >
              {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : null}
              Pindahkan
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
