import { EmptyState } from "@/components/empty-state";
import { StatusBadge } from "@/components/status-badge";
import type { DownlineWithMaskedBalance } from "@/services/referral.service";

const dateFormatter = new Intl.DateTimeFormat("id-ID", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

export function DownlineList({ downlines }: { downlines: DownlineWithMaskedBalance[] }) {
  if (downlines.length === 0) {
    return (
      <EmptyState
        title="Belum ada downline"
        description="Bagikan ID Referensi Anda — setiap pendaftar yang memakainya akan muncul di sini."
      />
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {downlines.map((downline) => (
        <div key={downline.relationship_id} className="flex flex-col gap-2 rounded-xl border p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate font-medium">{downline.full_name}</p>
              <p className="truncate text-xs text-muted-foreground">{downline.email}</p>
            </div>
            <StatusBadge status={downline.status} />
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">{downline.roleLabel}</span>
            <span className="font-mono font-semibold">Rp{downline.maskedBalance}</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Bergabung {dateFormatter.format(new Date(downline.joined_at))}
          </p>
        </div>
      ))}
    </div>
  );
}
