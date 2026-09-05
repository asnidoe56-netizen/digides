"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ApiError } from "@/lib/api/client";
import { setManualPaymentMethodStatus } from "../services/manual-payment-method-api";

export interface ManualPaymentMethodStatusToggleProps {
  id: string;
  isActive: boolean;
}

// A plain toggle, not a ConfirmDialog like the money-moving actions
// elsewhere on this page — turning a payment method on/off changes what
// Mitra are offered, it never moves any money itself.
export function ManualPaymentMethodStatusToggle({ id, isActive }: ManualPaymentMethodStatusToggleProps) {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setIsSaving(true);
    setError(null);
    try {
      await setManualPaymentMethodStatus(id, !isActive);
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Gagal mengubah status.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button type="button" variant="outline" size="sm" className="h-9" onClick={handleClick} disabled={isSaving}>
        {isActive ? "Nonaktifkan" : "Aktifkan"}
      </Button>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
