"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { EmptyState } from "@/components/empty-state";
import { MoneyDisplay } from "@/components/money-display";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ConfirmDialog } from "@/components/feedback/confirm-dialog";
import { ApiError } from "@/lib/api/client";
import type { AvailableCommissionSummary } from "@/repositories/commission.repository";
import { payCommission } from "../services/commission-api";

export interface CommissionPayoutSummaryProps {
  summary: AvailableCommissionSummary[];
}

// Every beneficiary who currently has AVAILABLE commission — "Bayarkan"
// pays out their *entire* available balance in one action (see
// commission.service.ts's payCommissionToBeneficiary), crediting their
// own wallet via a real TOPUP-style COMMISSION ledger entry.
export function CommissionPayoutSummary({ summary }: CommissionPayoutSummaryProps) {
  const router = useRouter();
  const [target, setTarget] = useState<AvailableCommissionSummary | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConfirm() {
    if (!target) return;
    setIsConfirming(true);
    setError(null);
    try {
      await payCommission(target.beneficiary_user_id);
      setTarget(null);
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Gagal membayarkan komisi.");
    } finally {
      setIsConfirming(false);
    }
  }

  if (summary.length === 0) {
    return (
      <EmptyState
        title="Tidak ada komisi yang siap dibayarkan"
        description='Komisi berstatus "Tersedia" akan muncul di sini dan bisa dibayarkan ke wallet penerima.'
      />
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:hidden">
        {summary.map((row) => (
          <div key={row.beneficiary_user_id} className="flex flex-col gap-3 rounded-lg border p-4">
            <div>
              <p className="truncate font-medium">{row.beneficiary_name}</p>
              <p className="truncate text-xs text-muted-foreground">{row.beneficiary_email}</p>
            </div>
            <div className="flex items-center justify-between">
              <MoneyDisplay amount={row.available_amount} size="md" />
              <p className="text-xs text-muted-foreground">{row.entry_count} entri</p>
            </div>
            <Button type="button" className="h-11 w-full" onClick={() => setTarget(row)}>
              Bayarkan
            </Button>
          </div>
        ))}
      </div>

      <div className="hidden overflow-x-auto rounded-lg border lg:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Penerima</TableHead>
              <TableHead className="text-right">Komisi Tersedia</TableHead>
              <TableHead className="text-right">Entri</TableHead>
              <TableHead className="w-px" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {summary.map((row) => (
              <TableRow key={row.beneficiary_user_id}>
                <TableCell>
                  <p className="font-medium">{row.beneficiary_name}</p>
                  <p className="text-xs text-muted-foreground">{row.beneficiary_email}</p>
                </TableCell>
                <TableCell className="text-right">
                  <MoneyDisplay amount={row.available_amount} size="sm" />
                </TableCell>
                <TableCell className="text-right text-muted-foreground">{row.entry_count}</TableCell>
                <TableCell>
                  <Button type="button" size="sm" className="h-9" onClick={() => setTarget(row)}>
                    Bayarkan
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <ConfirmDialog
        open={target !== null}
        onOpenChange={(open) => !open && setTarget(null)}
        title="Bayarkan Komisi?"
        description={
          target
            ? `${formatConfirmDescription(target)}${error ? `\n\n${error}` : ""}`
            : ""
        }
        confirmLabel="Bayarkan"
        onConfirm={handleConfirm}
        isConfirming={isConfirming}
      />
    </>
  );
}

function formatConfirmDescription(target: AvailableCommissionSummary): string {
  return `Seluruh komisi tersedia (${target.entry_count} entri) untuk ${target.beneficiary_name} akan dikreditkan ke wallet mereka.`;
}
