"use client";

import { useState } from "react";
import { FilterSheet } from "@/components/feedback/filter-sheet";
import {
  DEFAULT_USER_FILTER_VALUES,
  UserFilterFields,
  type UserFilterValues,
} from "./user-filter-fields";

export interface UserFilterDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appliedValue: UserFilterValues;
  onApply: (value: UserFilterValues) => void;
}

export function UserFilterDialog({ open, onOpenChange, appliedValue, onApply }: UserFilterDialogProps) {
  const [pending, setPending] = useState<UserFilterValues>(appliedValue);

  function handleOpenChange(nextOpen: boolean) {
    if (nextOpen) {
      setPending(appliedValue);
    }
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
      title="Filter Pengguna"
      onReset={() => setPending(DEFAULT_USER_FILTER_VALUES)}
      onApply={handleApply}
    >
      <UserFilterFields value={pending} onChange={setPending} />
    </FilterSheet>
  );
}
