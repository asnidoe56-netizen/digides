import { cn } from "@/lib/utils";
import type { StoreStatus } from "@/types/store";
import type { StoreOrderStatus, StorePaymentRequestStatus } from "@/types/store-order";

// Reuses the app's existing status token pairs (globals.css --status-*),
// the same ones <StatusBadge> uses for PPOB transactions, so a store's
// statuses read exactly like every other status in the app rather than
// introducing a second colour vocabulary.
const TONE_CLASS = {
  pending: "bg-status-pending text-status-pending-foreground",
  processing: "bg-status-processing text-status-processing-foreground",
  success: "bg-status-success text-status-success-foreground",
  failed: "bg-status-failed text-status-failed-foreground",
  neutral: "bg-muted text-muted-foreground",
} as const;

type Tone = keyof typeof TONE_CLASS;

const STORE_STATUS: Record<StoreStatus, { label: string; tone: Tone }> = {
  DRAFT: { label: "Draf", tone: "neutral" },
  SUBMITTED: { label: "Menunggu Verifikasi", tone: "pending" },
  ACTIVE: { label: "Aktif", tone: "success" },
  SUSPENDED: { label: "Ditangguhkan", tone: "failed" },
  CLOSED: { label: "Ditutup", tone: "neutral" },
};

const ORDER_STATUS: Record<StoreOrderStatus, { label: string; tone: Tone }> = {
  PENDING: { label: "Menunggu Bayar", tone: "pending" },
  PAID: { label: "Lunas", tone: "success" },
  FAILED: { label: "Gagal", tone: "failed" },
  EXPIRED: { label: "Kedaluwarsa", tone: "neutral" },
  CANCELLED: { label: "Dibatalkan", tone: "neutral" },
};

const PAYMENT_STATUS: Record<StorePaymentRequestStatus, { label: string; tone: Tone }> = {
  MENUNGGU: { label: "Menunggu", tone: "processing" },
  BERHASIL: { label: "Berhasil", tone: "success" },
  GAGAL: { label: "Gagal", tone: "failed" },
  KEDALUWARSA: { label: "Kedaluwarsa", tone: "neutral" },
  DIBATALKAN: { label: "Dibatalkan", tone: "neutral" },
};

function Pill({ label, tone, className }: { label: string; tone: Tone; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded-full px-2.5 py-1 text-xs font-semibold",
        TONE_CLASS[tone],
        className,
      )}
    >
      {label}
    </span>
  );
}

export function StoreStatusBadge({ status, className }: { status: StoreStatus; className?: string }) {
  return <Pill {...STORE_STATUS[status]} className={className} />;
}

export function StoreOrderStatusBadge({ status, className }: { status: StoreOrderStatus; className?: string }) {
  return <Pill {...ORDER_STATUS[status]} className={className} />;
}

export function StorePaymentStatusBadge({
  status,
  className,
}: {
  status: StorePaymentRequestStatus;
  className?: string;
}) {
  return <Pill {...PAYMENT_STATUS[status]} className={className} />;
}
