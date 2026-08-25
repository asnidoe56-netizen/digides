"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, CheckCircle2, XCircle } from "lucide-react";
import Link from "next/link";
import { ApiError } from "@/lib/api/client";
import { formatMoney } from "@/lib/formatting/money";
import { cn } from "@/lib/utils";
import { PurchasePinScreen } from "@/features/mitra-purchase";
import type { DirectDownline } from "@/repositories/referral.repository";
import { transferToDownline } from "../services/transfer-api";

export interface TransferFlowProps {
  homeHref: string;
  downlines: DirectDownline[];
  availableBalance: string;
}

type Phase = "select" | "confirm" | "pin" | "result";

const QUICK_AMOUNTS = [50000, 100000, 200000, 500000];

const ROLE_LABEL: Record<string, string> = {
  BUMDES_ADMIN: "Mitra",
  KONTER: "Agen",
  AFFILIATE: "Afiliasi",
};

export function TransferFlow({ homeHref, downlines, availableBalance }: TransferFlowProps) {
  const router = useRouter();
  const activeDownlines = useMemo(() => downlines.filter((d) => d.status === "ACTIVE"), [downlines]);

  const [phase, setPhase] = useState<Phase>("select");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [amountInput, setAmountInput] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pinError, setPinError] = useState<string | null>(null);
  const [resultStatus, setResultStatus] = useState<"SUCCESS" | "FAILED" | null>(null);
  const [resultMessage, setResultMessage] = useState<string | null>(null);

  const selected = activeDownlines.find((d) => d.user_id === selectedId) ?? null;
  const amount = Number(amountInput.replace(/\D/g, ""));
  const isAmountValid = amount > 0 && amount <= Number(availableBalance);

  async function handleSubmitPin(pin: string) {
    if (!selected) return;
    setIsSubmitting(true);
    setPinError(null);
    try {
      await transferToDownline({ recipientUserId: selected.user_id, amount, pin });
      setResultStatus("SUCCESS");
      setResultMessage(`Transfer ${formatMoney(amount)} ke ${selected.full_name} berhasil.`);
      setPhase("result");
    } catch (error) {
      setPinError(error instanceof ApiError ? error.message : "Transfer gagal diproses. Coba lagi.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (phase === "result" && resultStatus) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-6 p-6 text-center">
        {resultStatus === "SUCCESS" ? (
          <CheckCircle2 className="size-16 text-status-success-foreground" />
        ) : (
          <XCircle className="size-16 text-status-failed-foreground" />
        )}
        <div>
          <h1 className="text-lg font-semibold">
            {resultStatus === "SUCCESS" ? "Transfer Berhasil" : "Transfer Gagal"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">{resultMessage}</p>
        </div>
        <Link href={homeHref} className="w-full max-w-xs rounded-full bg-red-600 py-3 text-center font-semibold text-white">
          Kembali ke Beranda
        </Link>
      </div>
    );
  }

  if (phase === "pin") {
    return (
      <PurchasePinScreen
        onBack={() => setPhase("confirm")}
        onSubmit={handleSubmitPin}
        isSubmitting={isSubmitting}
        error={pinError}
      />
    );
  }

  if (phase === "confirm" && selected) {
    return (
      <div className="flex flex-1 flex-col">
        <header className="flex items-center gap-3 bg-red-600 px-4 py-3 text-white">
          <button
            type="button"
            onClick={() => setPhase("select")}
            aria-label="Kembali"
            className="flex size-8 items-center justify-center rounded-full hover:bg-white/10"
          >
            <ArrowLeft className="size-5" />
          </button>
          <h1 className="font-semibold">Konfirmasi Transfer</h1>
        </header>

        <div className="flex flex-1 flex-col gap-4 p-4">
          <p className="font-semibold">Detail Transfer</p>
          <div className="divide-y rounded-xl border px-3">
            <div className="flex items-center justify-between py-2">
              <span className="text-sm text-muted-foreground">Penerima</span>
              <span className="text-sm font-medium">{selected.full_name}</span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-sm text-muted-foreground">Email</span>
              <span className="text-sm font-medium">{selected.email}</span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-sm text-muted-foreground">Saldo Anda</span>
              <span className="text-sm font-medium">{formatMoney(availableBalance)}</span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-sm text-muted-foreground">Nominal Transfer</span>
              <span className="font-semibold">{formatMoney(amount)}</span>
            </div>
          </div>
        </div>

        <div className="fixed inset-x-0 bottom-16 z-30 mx-auto max-w-lg border-t bg-background p-4">
          <button
            type="button"
            onClick={() => setPhase("pin")}
            className="w-full rounded-full bg-red-600 py-3 text-center font-semibold text-white"
          >
            Kirim Sekarang
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col">
      <header className="flex items-center gap-3 bg-red-600 px-4 py-3 text-white">
        <button
          type="button"
          onClick={() => router.push(homeHref)}
          aria-label="Kembali"
          className="flex size-8 items-center justify-center rounded-full hover:bg-white/10"
        >
          <ArrowLeft className="size-5" />
        </button>
        <h1 className="font-semibold">Transfer ke Downline</h1>
      </header>

      <div className={cn("flex flex-1 flex-col gap-5 p-4", selected && "pb-32")}>
        <div className="flex flex-col gap-3">
          <p className="font-semibold">Pilih Downline</p>
          {activeDownlines.length === 0 ? (
            <p className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
              Anda belum punya downline aktif. Bagikan ID Referensi Anda lewat Menu Mitra terlebih dahulu.
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {activeDownlines.map((downline) => (
                <button
                  key={downline.user_id}
                  type="button"
                  onClick={() => setSelectedId(downline.user_id)}
                  className={cn(
                    "flex items-center justify-between gap-3 rounded-xl border p-3 text-left",
                    selectedId === downline.user_id ? "border-red-600 bg-red-50" : "hover:border-red-300",
                  )}
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium">{downline.full_name}</p>
                    <p className="truncate text-xs text-muted-foreground">{downline.email}</p>
                  </div>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {ROLE_LABEL[downline.roles[0]] ?? downline.roles[0] ?? "-"}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {selected ? (
          <div className="flex flex-col gap-3">
            <p className="font-semibold">Nominal Transfer</p>
            <input
              type="text"
              inputMode="numeric"
              value={amountInput}
              onChange={(event) => setAmountInput(event.target.value)}
              placeholder="Contoh: 50000"
              className="rounded-xl border p-3 font-medium outline-none placeholder:font-normal placeholder:text-muted-foreground"
            />
            <div className="grid grid-cols-4 gap-2">
              {QUICK_AMOUNTS.map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setAmountInput(String(value))}
                  className="rounded-lg border py-2 text-xs font-medium hover:border-red-300"
                >
                  {value / 1000}rb
                </button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">Saldo tersedia: {formatMoney(availableBalance)}</p>
            {amountInput.length > 0 && !isAmountValid ? (
              <p className="text-xs text-destructive">
                {amount <= 0 ? "Nominal transfer tidak valid." : "Nominal melebihi saldo tersedia."}
              </p>
            ) : null}
          </div>
        ) : null}
      </div>

      {selected ? (
        // bottom-16, not bottom-0 — the global MitraBottomNav (layout.tsx)
        // already occupies the bottom 4rem (h-16) on every page.
        <div className="fixed inset-x-0 bottom-16 z-30 mx-auto max-w-lg border-t bg-background p-4">
          <button
            type="button"
            disabled={!isAmountValid}
            onClick={() => setPhase("confirm")}
            className="w-full rounded-full bg-red-600 py-3 text-center font-semibold text-white disabled:opacity-40"
          >
            Lanjutkan
          </button>
        </div>
      ) : null}
    </div>
  );
}
