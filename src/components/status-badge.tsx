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
  OPEN: "bg-status-pending text-status-pending-foreground",
  PROCESSING: "bg-status-processing text-status-processing-foreground",
  SUCCESS: "bg-status-success text-status-success-foreground",
  AVAILABLE: "bg-status-success text-status-success-foreground",
  PAID: "bg-status-success text-status-success-foreground",
  ACTIVE: "bg-status-success text-status-success-foreground",
  RESOLVED: "bg-status-success text-status-success-foreground",
  MATCH: "bg-status-success text-status-success-foreground",
  FAILED: "bg-status-failed text-status-failed-foreground",
  CANCELLED: "bg-status-failed text-status-failed-foreground",
  EXPIRED: "bg-status-failed text-status-failed-foreground",
  LOCKED: "bg-status-failed text-status-failed-foreground",
  BLOCKED: "bg-status-failed text-status-failed-foreground",
  SUSPENDED: "bg-status-failed text-status-failed-foreground",
  NEED_REVIEW: "bg-status-failed text-status-failed-foreground",
  STATUS_MISMATCH: "bg-status-failed text-status-failed-foreground",
  AMOUNT_MISMATCH: "bg-status-failed text-status-failed-foreground",
  LOCAL_ONLY: "bg-status-processing text-status-processing-foreground",
  PROVIDER_ONLY: "bg-status-processing text-status-processing-foreground",
  GANGGUAN: "bg-status-processing text-status-processing-foreground",
  DISABLED: "bg-muted text-muted-foreground",
  INACTIVE: "bg-muted text-muted-foreground",
  DELETED: "bg-muted text-muted-foreground",
  CLOSED: "bg-muted text-muted-foreground",
  REFUNDED: "bg-status-refunded text-status-refunded-foreground",
  REVERSED: "bg-status-refunded text-status-refunded-foreground",
  TRUSTED: "bg-status-success text-status-success-foreground",
  REVOKED: "bg-muted text-muted-foreground",
  INVESTIGATING: "bg-status-processing text-status-processing-foreground",
  DISMISSED: "bg-muted text-muted-foreground",
  LOW: "bg-muted text-muted-foreground",
  MEDIUM: "bg-status-pending text-status-pending-foreground",
  HIGH: "bg-status-failed text-status-failed-foreground",
  LOGOUT: "bg-muted text-muted-foreground",
  NEW_DEVICE: "bg-status-processing text-status-processing-foreground",
  SESSION_REVOKED: "bg-status-failed text-status-failed-foreground",
  ACCOUNT_LOCKED: "bg-status-failed text-status-failed-foreground",
  LOGIN_SUCCESS: "bg-status-success text-status-success-foreground",
  LOGIN_FAILED: "bg-status-failed text-status-failed-foreground",
};

const STATUS_LABEL: Record<string, string> = {
  PENDING: "Pending",
  RESERVED: "Diproses",
  REQUESTED: "Diajukan",
  OPEN: "Terbuka",
  PROCESSING: "Diproses",
  SUCCESS: "Berhasil",
  AVAILABLE: "Tersedia",
  PAID: "Dibayar",
  ACTIVE: "Aktif",
  RESOLVED: "Selesai",
  MATCH: "Cocok",
  FAILED: "Gagal",
  CANCELLED: "Dibatalkan",
  EXPIRED: "Kedaluwarsa",
  LOCKED: "Terkunci",
  BLOCKED: "Diblokir",
  SUSPENDED: "Ditangguhkan",
  NEED_REVIEW: "Perlu Ditinjau",
  STATUS_MISMATCH: "Status Tidak Cocok",
  AMOUNT_MISMATCH: "Nominal Tidak Cocok",
  LOCAL_ONLY: "Hanya Lokal",
  PROVIDER_ONLY: "Hanya Provider",
  GANGGUAN: "Gangguan",
  DISABLED: "Nonaktif",
  INACTIVE: "Nonaktif",
  DELETED: "Dihapus",
  CLOSED: "Ditutup",
  REFUNDED: "Dikembalikan",
  REVERSED: "Dibalik",
  TRUSTED: "Terpercaya",
  REVOKED: "Dicabut",
  INVESTIGATING: "Diselidiki",
  DISMISSED: "Diabaikan",
  LOW: "Rendah",
  MEDIUM: "Sedang",
  HIGH: "Tinggi",
  LOGOUT: "Logout",
  NEW_DEVICE: "Perangkat Baru",
  SESSION_REVOKED: "Sesi Dicabut",
  ACCOUNT_LOCKED: "Akun Terkunci",
  LOGIN_SUCCESS: "Berhasil",
  LOGIN_FAILED: "Gagal",
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
