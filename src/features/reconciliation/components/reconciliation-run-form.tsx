"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiError } from "@/lib/api/client";
import { runReconciliation, type RunReconciliationResult } from "../services/reconciliation-api";

const CATEGORY_LABEL: Record<string, string> = {
  MATCH: "Cocok",
  STATUS_MISMATCH: "Status Tidak Cocok",
  AMOUNT_MISMATCH: "Nominal Tidak Cocok",
  LOCAL_ONLY: "Hanya Lokal",
  PROVIDER_ONLY: "Hanya Provider",
  NEED_REVIEW: "Perlu Ditinjau",
};

// Compares local transactions against what Digiflazz currently reports —
// bounded to 50 transactions per run (reconciliation.service.ts) so this
// never fires an unbounded batch of real API calls from one click.
export function ReconciliationRunForm() {
  const router = useRouter();
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<RunReconciliationResult | null>(null);

  async function handleRun() {
    setIsRunning(true);
    setError(null);
    setResult(null);
    try {
      const summary = await runReconciliation(dateFrom || undefined, dateTo || undefined);
      setResult(summary);
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Gagal menjalankan rekonsiliasi.");
    } finally {
      setIsRunning(false);
    }
  }

  return (
    <div className="flex flex-col gap-4 rounded-lg border p-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="grid gap-2">
          <Label htmlFor="reconciliation-date-from">Dari Tanggal</Label>
          <Input
            id="reconciliation-date-from"
            type="date"
            className="h-11"
            value={dateFrom}
            onChange={(event) => setDateFrom(event.target.value)}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="reconciliation-date-to">Sampai Tanggal</Label>
          <Input
            id="reconciliation-date-to"
            type="date"
            className="h-11"
            value={dateTo}
            onChange={(event) => setDateTo(event.target.value)}
          />
        </div>
        <div className="flex items-end">
          <Button type="button" className="h-11 w-full" onClick={handleRun} disabled={isRunning}>
            {isRunning ? "Memproses..." : "Jalankan Rekonsiliasi"}
          </Button>
        </div>
      </div>

      {error ? (
        <p role="alert" className="rounded-md bg-status-failed px-3 py-2 text-sm text-status-failed-foreground">
          {error}
        </p>
      ) : null}

      {result ? (
        <div className="rounded-md bg-muted/50 p-3 text-sm">
          <p className="font-medium">{result.checked} transaksi diperiksa.</p>
          <p className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-muted-foreground">
            {Object.entries(result.byCategory)
              .filter(([, count]) => count > 0)
              .map(([category, count]) => (
                <span key={category}>
                  {CATEGORY_LABEL[category] ?? category}: {count}
                </span>
              ))}
          </p>
        </div>
      ) : null}
    </div>
  );
}
