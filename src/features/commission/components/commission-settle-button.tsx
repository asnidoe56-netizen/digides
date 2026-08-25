"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ApiError } from "@/lib/api/client";
import { settlePendingCommissions } from "../services/commission-api";

// PENDING -> AVAILABLE once holding_period_days has passed — there's no
// cron job in this app, so an admin triggers the pass explicitly here
// (see commission.service.ts's settlePendingCommissions).
export function CommissionSettleButton() {
  const router = useRouter();
  const [isRunning, setIsRunning] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleClick() {
    setIsRunning(true);
    setMessage(null);
    try {
      const { settledCount } = await settlePendingCommissions();
      setMessage(
        settledCount > 0
          ? `${settledCount} komisi dipindahkan ke status Tersedia.`
          : "Tidak ada komisi yang siap diproses saat ini.",
      );
      router.refresh();
    } catch (error) {
      setMessage(error instanceof ApiError ? error.message : "Gagal memproses komisi tertunda.");
    } finally {
      setIsRunning(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <Button type="button" variant="outline" className="h-11 w-fit" onClick={handleClick} disabled={isRunning}>
        {isRunning ? "Memproses..." : "Proses Komisi Tertunda"}
      </Button>
      {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}
    </div>
  );
}
