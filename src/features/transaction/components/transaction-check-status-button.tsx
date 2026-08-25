"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ApiError } from "@/lib/api/client";
import { checkTransactionStatus } from "../services/transaction-api";

export function TransactionCheckStatusButton({ transactionId }: { transactionId: string }) {
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setIsChecking(true);
    setError(null);
    try {
      await checkTransactionStatus(transactionId);
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Gagal memeriksa status.");
    } finally {
      setIsChecking(false);
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <Button type="button" variant="outline" size="sm" className="h-9" onClick={handleClick} disabled={isChecking}>
        {isChecking ? "Memeriksa..." : "Cek Status"}
      </Button>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
