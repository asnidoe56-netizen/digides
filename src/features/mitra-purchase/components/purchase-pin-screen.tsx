"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, Delete } from "lucide-react";
import { cn } from "@/lib/utils";

const PIN_LENGTH = 6;
const KEYPAD_ROWS = [
  ["1", "2", "3"],
  ["4", "5", "6"],
  ["7", "8", "9"],
];

export interface PurchasePinScreenProps {
  onBack: () => void;
  onSubmit: (pin: string) => void;
  isSubmitting: boolean;
  error: string | null;
}

export function PurchasePinScreen({ onBack, onSubmit, isSubmitting, error }: PurchasePinScreenProps) {
  const [digits, setDigits] = useState("");

  // Reset the pad after a failed attempt so the user isn't stuck re-typing
  // over stale digits — but only once `error` actually changes, not on
  // every render.
  useEffect(() => {
    if (error) setDigits("");
  }, [error]);

  function pressDigit(digit: string) {
    if (isSubmitting || digits.length >= PIN_LENGTH) return;
    const next = digits + digit;
    setDigits(next);
    if (next.length === PIN_LENGTH) {
      onSubmit(next);
    }
  }

  function pressBackspace() {
    if (isSubmitting) return;
    setDigits((prev) => prev.slice(0, -1));
  }

  return (
    <div className="flex flex-1 flex-col">
      <header className="flex items-center gap-3 bg-red-600 px-4 py-3 text-white">
        <button
          type="button"
          onClick={onBack}
          disabled={isSubmitting}
          aria-label="Kembali"
          className="flex size-8 items-center justify-center rounded-full hover:bg-white/10 disabled:opacity-50"
        >
          <ArrowLeft className="size-5" />
        </button>
        <h1 className="font-semibold">Masukkan PIN</h1>
      </header>

      <div className="flex flex-1 flex-col items-center gap-6 p-6">
        <p className="text-center text-sm text-muted-foreground">
          Masukkan PIN Anda untuk melanjutkan transaksi
        </p>

        <div className="flex gap-3">
          {Array.from({ length: PIN_LENGTH }).map((_, index) => (
            <span
              key={index}
              className={cn(
                "size-3.5 rounded-full border-2",
                index < digits.length ? "border-red-600 bg-red-600" : "border-muted-foreground/40",
              )}
            />
          ))}
        </div>

        {error ? <p className="text-center text-sm text-destructive">{error}</p> : null}
        {isSubmitting ? <p className="text-center text-sm text-muted-foreground">Memproses transaksi...</p> : null}

        <div className="mt-2 grid grid-cols-3 gap-4">
          {KEYPAD_ROWS.flat().map((digit) => (
            <button
              key={digit}
              type="button"
              onClick={() => pressDigit(digit)}
              disabled={isSubmitting}
              className="flex size-16 items-center justify-center rounded-xl border text-xl font-medium disabled:opacity-40"
            >
              {digit}
            </button>
          ))}
          <div />
          <button
            type="button"
            onClick={() => pressDigit("0")}
            disabled={isSubmitting}
            className="flex size-16 items-center justify-center rounded-xl border text-xl font-medium disabled:opacity-40"
          >
            0
          </button>
          <button
            type="button"
            onClick={pressBackspace}
            disabled={isSubmitting}
            aria-label="Hapus"
            className="flex size-16 items-center justify-center rounded-xl border disabled:opacity-40"
          >
            <Delete className="size-5" />
          </button>
        </div>

        <button type="button" disabled title="Segera hadir" className="text-sm font-medium text-red-600/60">
          Lupa PIN?
        </button>
      </div>
    </div>
  );
}
