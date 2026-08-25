import { EmptyState } from "@/components/empty-state";
import { StatusBadge } from "@/components/status-badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { SecurityIncidentWithDetail } from "@/repositories/security-incident.repository";
import { DismissIncidentButton, InvestigateIncidentButton, ResolveIncidentDialog } from "./incident-actions";

const dateFormatter = new Intl.DateTimeFormat("id-ID", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

const TYPE_LABEL: Record<string, string> = {
  BRUTE_FORCE_LOGIN: "Brute Force Login",
  PIN_LOCKOUT: "PIN Terkunci",
  SUSPICIOUS_DEVICE: "Perangkat Mencurigakan",
};

export function IncidentList({ incidents }: { incidents: SecurityIncidentWithDetail[] }) {
  if (incidents.length === 0) {
    return (
      <EmptyState
        title="Tidak ada insiden keamanan"
        description="Insiden yang dibuat otomatis oleh aturan keamanan (brute-force, PIN terkunci, dll.) akan muncul di sini."
      />
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {incidents.map((incident) => (
        <div key={incident.id} className="flex flex-col gap-2 rounded-lg border p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="font-medium">{TYPE_LABEL[incident.type] ?? incident.type}</p>
              <p className="text-xs text-muted-foreground">
                {incident.owner_name ?? "Tidak terkait pengguna tertentu"}
                {incident.device_name ? ` · ${incident.device_name}` : ""}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <StatusBadge status={incident.severity} />
              <StatusBadge status={incident.status} />
            </div>
          </div>
          <p className="text-sm">{incident.description}</p>
          {incident.resolution_note ? (
            <p className="text-xs text-status-success">Catatan: {incident.resolution_note}</p>
          ) : null}
          <p className="text-xs text-muted-foreground">{dateFormatter.format(new Date(incident.created_at))}</p>
          {incident.status === "OPEN" || incident.status === "INVESTIGATING" ? (
            <div className="flex flex-wrap gap-2">
              {incident.status === "OPEN" ? <InvestigateIncidentButton incidentId={incident.id} /> : null}
              <ResolveIncidentDialog incidentId={incident.id} />
              <DismissIncidentButton incidentId={incident.id} />
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
}
