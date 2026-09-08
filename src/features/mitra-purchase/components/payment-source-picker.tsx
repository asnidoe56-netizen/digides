"use client";

import { Store, Wallet } from "lucide-react";
import { formatMoney } from "@/lib/formatting/money";
import { cn } from "@/lib/utils";

export type PaymentSource = "PERSONAL" | "STORE";

export interface PaymentSourcePickerProps {
  value: PaymentSource;
  onChange: (next: PaymentSource) => void;
  personalBalance: string;
  storeName: string;
  storeBalance: string;
  /** Price of the purchase, so a source that can't cover it is visibly
   *  marked rather than only failing after the PIN is entered. */
  price: number;
  disabled?: boolean;
}

// Only rendered for a mitra who actually owns an ACTIVE store — everyone
// else keeps the single-wallet flow they always had, with no extra choice
// to make. This is what finally closes the loop in PRD Digides Toko §1:
// money a warung takes from its customers is only "modal jualan pulsa" if
// there is a way to spend it, and until this existed the store balance had
// no route out at all.
export function PaymentSourcePicker({
  value,
  onChange,
  personalBalance,
  storeName,
  storeBalance,
  price,
  disabled,
}: PaymentSourcePickerProps) {
  const options = [
    {
      id: "PERSONAL" as const,
      icon: Wallet,
      label: "Saldo Pribadi",
      balance: personalBalance,
    },
    {
      id: "STORE" as const,
      icon: Store,
      label: storeName,
      balance: storeBalance,
      hint: "Saldo toko",
    },
  ];

  return (
    <div className="flex flex-col gap-2">
      {options.map((option) => {
        const isSelected = value === option.id;
        const isEnough = Number(option.balance) >= price;

        return (
          <button
            key={option.id}
            type="button"
            disabled={disabled}
            onClick={() => onChange(option.id)}
            aria-pressed={isSelected}
            className={cn(
              "flex items-center gap-3 rounded-xl border p-3 text-left transition-colors disabled:opacity-60",
              isSelected ? "border-red-600 bg-red-50/60" : "hover:bg-accent",
            )}
          >
            <span
              className={cn(
                "flex size-10 shrink-0 items-center justify-center rounded-lg",
                isSelected ? "bg-red-600 text-white" : "bg-muted text-muted-foreground",
              )}
            >
              <option.icon className="size-5" />
            </span>

            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium">{option.label}</span>
              <span className="block text-xs text-muted-foreground">
                {option.hint ? `${option.hint} · ` : ""}
                {formatMoney(option.balance)}
                {!isEnough ? <span className="ml-1 text-destructive">(tidak cukup)</span> : null}
              </span>
            </span>

            <span
              className={cn(
                "flex size-5 shrink-0 items-center justify-center rounded-full border-2",
                isSelected ? "border-red-600" : "border-muted-foreground/40",
              )}
            >
              {isSelected ? <span className="size-2.5 rounded-full bg-red-600" /> : null}
            </span>
          </button>
        );
      })}
    </div>
  );
}
