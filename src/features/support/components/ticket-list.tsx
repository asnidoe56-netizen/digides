import { EmptyState } from "@/components/empty-state";
import { StatusBadge } from "@/components/status-badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { MitraComplaintWithDetail } from "@/repositories/mitra-complaint.repository";
import type { SupportAgent } from "@/types/support";
import { TicketAssignDialog } from "./ticket-assign-dialog";
import { TicketResolveDialog } from "./ticket-resolve-dialog";

const dateFormatter = new Intl.DateTimeFormat("id-ID", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

export interface TicketListProps {
  tickets: MitraComplaintWithDetail[];
  agents: SupportAgent[];
}

export function TicketList({ tickets, agents }: TicketListProps) {
  if (tickets.length === 0) {
    return (
      <EmptyState
        title="Belum ada tiket"
        description="Keluhan yang dikirim mitra akan muncul di sini untuk ditugaskan dan diselesaikan."
      />
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:hidden">
        {tickets.map((ticket) => (
          <div key={ticket.id} className="flex flex-col gap-2 rounded-lg border p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate font-medium">{ticket.subject}</p>
                <p className="truncate text-xs text-muted-foreground">{ticket.mitra_name}</p>
              </div>
              <StatusBadge status={ticket.status} />
            </div>
            <p className="line-clamp-2 text-sm text-muted-foreground">{ticket.message}</p>
            <p className="text-xs text-muted-foreground">
              {ticket.agent_name ? `Ditugaskan ke ${ticket.agent_name}` : "Belum ditugaskan"} ·{" "}
              {dateFormatter.format(new Date(ticket.created_at))}
            </p>
            {ticket.status === "OPEN" ? (
              <div className="flex gap-2">
                <TicketAssignDialog ticketId={ticket.id} agents={agents} currentAgentId={ticket.assigned_agent_id} />
                <TicketResolveDialog ticketId={ticket.id} />
              </div>
            ) : ticket.resolution_note ? (
              <p className="text-xs text-status-success">Selesai: {ticket.resolution_note}</p>
            ) : null}
          </div>
        ))}
      </div>

      <div className="hidden overflow-x-auto rounded-lg border lg:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Waktu</TableHead>
              <TableHead>Mitra</TableHead>
              <TableHead>Subjek</TableHead>
              <TableHead>Ditugaskan</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-px" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {tickets.map((ticket) => (
              <TableRow key={ticket.id}>
                <TableCell className="text-muted-foreground">
                  {dateFormatter.format(new Date(ticket.created_at))}
                </TableCell>
                <TableCell>{ticket.mitra_name}</TableCell>
                <TableCell>
                  <p className="font-medium">{ticket.subject}</p>
                  <p className="line-clamp-1 text-xs text-muted-foreground">{ticket.message}</p>
                </TableCell>
                <TableCell className="text-muted-foreground">{ticket.agent_name ?? "-"}</TableCell>
                <TableCell>
                  <StatusBadge status={ticket.status} />
                </TableCell>
                <TableCell>
                  {ticket.status === "OPEN" ? (
                    <div className="flex justify-end gap-2">
                      <TicketAssignDialog
                        ticketId={ticket.id}
                        agents={agents}
                        currentAgentId={ticket.assigned_agent_id}
                      />
                      <TicketResolveDialog ticketId={ticket.id} />
                    </div>
                  ) : null}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  );
}
