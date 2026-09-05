"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiError } from "@/lib/api/client";
import { setCommissionAutoPayout, type CommissionSettingsPayload } from "../services/commission-api";

export interface CommissionAutoPayoutSettingsProps {
  settings: CommissionSettingsPayload;
}

// The on/off switch for the unattended monthly job
// (src/jobs/monthly-commission-payout.ts). Enabled: the settle+payout
// cycle runs on its own on payout_day_of_month, no admin action needed.
// Disabled: only the "Proses Bulan Ini" button below moves anything.
export function CommissionAutoPayoutSettings({ settings }: CommissionAutoPayoutSettingsProps) {
  const router = useRouter();
  const [enabled, setEnabled] = useState(settings.auto_payout_enabled);
  const [dayOfMonth, setDayOfMonth] = useState(settings.payout_day_of_month);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const isDirty = enabled !== settings.auto_payout_enabled || dayOfMonth !== settings.payout_day_of_month;

  async function handleSave() {
    setIsSaving(true);
    setMessage(null);
    try {
      await setCommissionAutoPayout(enabled, dayOfMonth);
      setMessage("Pengaturan pencairan otomatis disimpan.");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof ApiError ? error.message : "Gagal menyimpan pengaturan.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-4 rounded-lg border p-4">
      <div className="flex items-start gap-3">
        <Checkbox
          id="auto-payout-enabled"
          checked={enabled}
          onCheckedChange={(checked) => setEnabled(checked === true)}
          className="mt-1"
        />
        <div className="flex-1">
          <Label htmlFor="auto-payout-enabled" className="font-medium">
            Pencairan Otomatis Bulanan
          </Label>
          <p className="text-sm text-muted-foreground">
            Jika aktif, sistem otomatis memproses dan mencairkan seluruh komisi tersedia ke wallet penerima setiap
            bulan tanpa perlu diklik admin. Jika nonaktif, gunakan tombol &quot;Proses Bulan Ini&quot; secara manual.
          </p>
        </div>
      </div>

      <div className="grid max-w-40 gap-2">
        <Label htmlFor="auto-payout-day">Tanggal tiap bulan</Label>
        <Input
          id="auto-payout-day"
          type="number"
          min={1}
          max={28}
          className="h-11"
          value={dayOfMonth}
          onChange={(event) => setDayOfMonth(Number(event.target.value) || 1)}
        />
      </div>

      <div className="flex items-center gap-3">
        <Button type="button" className="h-10 w-fit" onClick={handleSave} disabled={isSaving || !isDirty}>
          {isSaving ? "Menyimpan..." : "Simpan Pengaturan"}
        </Button>
        {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}
      </div>
    </div>
  );
}
