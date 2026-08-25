"use client";

import { useState } from "react";
import { FilterSheet } from "@/components/feedback/filter-sheet";
import {
  DEFAULT_WALLET_ACCOUNT_FILTER_VALUES,
  WalletAccountFilterFields,
  type WalletAccountFilterValues,
} from "./wallet-account-filter-fields";

export interface WalletAccountFilterDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appliedValue: WalletAccountFilterValues;
  onApply: (value: WalletAccountFilterValues) => void;
}

export function WalletAccountFilterDialog({
  open,
  onOpenChange,
  appliedValue,
  onApply,
}: WalletAccountFilterDialogProps) {
  const [pending, setPending] = useState<WalletAccountFilterValues>(appliedValue);

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
      title="Filter Wallet Accounts"
      onReset={() => setPending(DEFAULT_WALLET_ACCOUNT_FILTER_VALUES)}
      onApply={handleApply}
    >
      <WalletAccountFilterFields value={pending} onChange={setPending} />
    </FilterSheet>
  );
}
