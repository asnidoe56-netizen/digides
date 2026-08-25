import { Card, CardContent } from "@/components/ui/card";

function StatCard({ label, value, tone }: { label: string; value: number; tone?: "success" | "failed" }) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-1 p-4">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p
          className={
            tone === "success"
              ? "text-2xl font-semibold text-status-success"
              : tone === "failed"
                ? "text-2xl font-semibold text-status-failed"
                : "text-2xl font-semibold"
          }
        >
          {value}
        </p>
      </CardContent>
    </Card>
  );
}

export interface SupportOverviewData {
  activeAgentCount: number;
  openTickets: number;
  resolvedTickets: number;
}

export function SupportOverview({ overview }: { overview: SupportOverviewData }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      <StatCard label="Agen Aktif" value={overview.activeAgentCount} />
      <StatCard label="Tiket Terbuka" value={overview.openTickets} tone="failed" />
      <StatCard label="Tiket Selesai" value={overview.resolvedTickets} tone="success" />
    </div>
  );
}
