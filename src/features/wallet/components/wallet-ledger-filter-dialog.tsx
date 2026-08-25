"use client";

import { useState } from "react";
import { FilterSheet } from "@/components/feedback/filter-sheet";
import {
  DEFAULT_WALLET_LEDGER_FILTER_VALUES,
  WalletLedgerFilterFields,
  type WalletLedgerFilterValues,
} from "./wallet-ledger-filter-fields";

export interface WalletLedgerFilterDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  appliedValue: WalletLedgerFilterValues;
  onApply: (value: WalletLedgerFilterValues) => void;
}

export function WalletLedgerFilterDialog({
  open,
  onOpenChange,
  title,
  appliedValue,
  onApply,
}: WalletLedgerFilterDialogProps) {
  const [pending, setPending] = useState<WalletLedgerFilterValues>(appliedValue);

  function handleOpenChange(nextOpen: boolean) {
    if (nextOpen) setPending(appliedValue);
    onOpenChange(nextOpen);
  }

  function handleApply() {
    onApply(pending);
    onOpenChange(false);
  }

  return (
    <FilterSheet
      open={open}
      onOpenChange={handleOpenChange}
      title={title}
      onReset={() => setPending(DEFAULT_WALLET_LEDGER_FILTER_VALUES)}
      onApply={handleApply}
    >
      <WalletLedgerFilterFields value={pending} onChange={setPending} />
    </FilterSheet>
  );
}
