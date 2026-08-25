import { Pencil } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/empty-state";
import { StatusBadge } from "@/components/status-badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { SupportAgentWithWorkload } from "@/repositories/support-agent.repository";
import { AgentFormDialog } from "./agent-form-dialog";
import { AgentStatusToggle } from "./agent-status-toggle";

const ROLE_LABEL: Record<string, string> = { AGENT: "Agen", SUPERVISOR: "Supervisor" };

export function AgentList({ agents }: { agents: SupportAgentWithWorkload[] }) {
  if (agents.length === 0) {
    return (
      <EmptyState
        title="Belum ada anggota tim support"
        description='Klik "Tambah Agen" untuk menambahkan anggota tim support pertama.'
      />
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:hidden">
        {agents.map((agent) => (
          <div key={agent.id} className="flex flex-col gap-3 rounded-lg border p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate font-medium">{agent.full_name}</p>
                <p className="truncate text-xs text-muted-foreground">{agent.email}</p>
              </div>
              <StatusBadge status={agent.status} />
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Badge variant="outline">{ROLE_LABEL[agent.role]}</Badge>
              <span>{agent.open_ticket_count} tiket terbuka</span>
            </div>
            <div className="flex gap-2">
              <AgentFormDialog
                agent={agent}
                trigger={
                  <Button type="button" variant="outline" size="sm" className="h-9 flex-1 gap-2">
                    <Pencil className="size-3.5" />
                    Ubah
                  </Button>
                }
              />
              <AgentStatusToggle agent={agent} />
            </div>
          </div>
        ))}
      </div>

      <div className="hidden overflow-x-auto rounded-lg border lg:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nama</TableHead>
              <TableHead>Peran</TableHead>
              <TableHead className="text-right">Tiket Terbuka</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-px" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {agents.map((agent) => (
              <TableRow key={agent.id}>
                <TableCell>
                  <p className="font-medium">{agent.full_name}</p>
                  <p className="text-xs text-muted-foreground">{agent.email}</p>
                </TableCell>
                <TableCell>
                  <Badge variant="outline">{ROLE_LABEL[agent.role]}</Badge>
                </TableCell>
                <TableCell className="text-right text-muted-foreground">{agent.open_ticket_count}</TableCell>
                <TableCell>
                  <StatusBadge status={agent.status} />
                </TableCell>
                <TableCell>
                  <div className="flex justify-end gap-2">
                    <AgentFormDialog
                      agent={agent}
                      trigger={
                        <Button type="button" variant="outline" size="sm" className="h-9 gap-2">
                          <Pencil className="size-3.5" />
                          Ubah
                        </Button>
                      }
                    />
                    <AgentStatusToggle agent={agent} />
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  );
}
