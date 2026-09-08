import { apiFetch } from "@/lib/api/client";

export interface TransferInput {
  recipientUserId: string;
  amount: number;
  pin: string;
  idempotencyKey: string;
}

export function transferToDownline(input: TransferInput) {
  return apiFetch<{ result: { reference: string } }>("/api/wallet/transfer", {
    method: "POST",
    body: JSON.stringify(input),
  });
}
