import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

// Every status string this app's status columns can hold (transactions,
// commission_ledger, payments, user_transaction_pins, reconciliation) is
// mapped to one of five visual buckets — pending, processing, success,
// failed, refunded — per issue M03 section 25 "Status System". Unknown
// values fall back to a neutral style instead of breaking.
const STATUS_STYLE: Record<string, string> = {
  PENDING: "bg-status-pending text-status-pending-foreground",
  RESERVED: "bg-status-pending text-status-pending-foreground",
  REQUESTED: "bg-status-pending text-status-pending-foreground",
  PROCESSING: "bg-status-processing text-status-processing-foreground",
  SUCCESS: "bg-status-success text-status-success-foreground",
  AVAILABLE: "bg-status-success text-status-success-foreground",
  PAID: "bg-status-success text-status-success-foreground",
  ACTIVE: "bg-status-success text-status-success-foreground",
  MATCH: "bg-status-success text-status-success-foreground",
  FAILED: "bg-status-failed text-status-failed-foreground",
  CANCELLED: "bg-status-failed text-status-failed-foreground",
  EXPIRED: "bg-status-failed text-status-failed-foreground",
  LOCKED: "bg-status-failed text-status-failed-foreground",
  BLOCKED: "bg-status-failed text-status-failed-foreground",
  SUSPENDED: "bg-status-failed text-status-failed-foreground",
  NEED_REVIEW: "bg-status-failed text-status-failed-foreground",
  REFUNDED: "bg-status-refunded text-status-refunded-foreground",
  REVERSED: "bg-status-refunded text-status-refunded-foreground",
};

const STATUS_LABEL: Record<string, string> = {
  PENDING: "Pending",
  RESERVED: "Diproses",
  REQUESTED: "Diajukan",
  PROCESSING: "Diproses",
  SUCCESS: "Berhasil",
  AVAILABLE: "Tersedia",
  PAID: "Dibayar",
  ACTIVE: "Aktif",
  MATCH: "Cocok",
  FAILED: "Gagal",
  CANCELLED: "Dibatalkan",
  EXPIRED: "Kedaluwarsa",
  LOCKED: "Terkunci",
  BLOCKED: "Diblokir",
  SUSPENDED: "Ditangguhkan",
  NEED_REVIEW: "Perlu Ditinjau",
  REFUNDED: "Dikembalikan",
  REVERSED: "Dibalik",
};

export interface StatusBadgeProps {
  status: string;
  className?: string;
}

// Shared across every feature so PENDING/SUCCESS/FAILED/etc. always look
// the same regardless of which table the status came from — see
// src/types/transaction.ts, commission.ts, payment.ts for the source enums.
export function StatusBadge({ status, className }: StatusBadgeProps) {
  const style = STATUS_STYLE[status] ?? "bg-muted text-muted-foreground";
  const label = STATUS_LABEL[status] ?? status;

  return (
    <Badge className={cn("border-transparent font-medium", style, className)}>
      {label}
    </Badge>
  );
}
