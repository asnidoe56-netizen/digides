import { EmptyState } from "@/components/empty-state";
import { StatusBadge } from "@/components/status-badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { UserSessionWithDetail } from "@/repositories/user-session.repository";
import { RevokeAllSessionsButton, RevokeSessionButton } from "./session-actions";

const dateFormatter = new Intl.DateTimeFormat("id-ID", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

function sessionStatus(session: UserSessionWithDetail): "REVOKED" | "EXPIRED" | "ACTIVE" {
  if (session.revoked_at) return "REVOKED";
  if (new Date(session.expires_at) < new Date()) return "EXPIRED";
  return "ACTIVE";
}

export function SessionList({ sessions }: { sessions: UserSessionWithDetail[] }) {
  if (sessions.length === 0) {
    return <EmptyState title="Belum ada sesi login" description="Sesi login aktif setiap pengguna akan muncul di sini." />;
  }

  return (
    <>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:hidden">
        {sessions.map((session) => {
          const status = sessionStatus(session);
          return (
            <div key={session.id} className="flex flex-col gap-2 rounded-lg border p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-medium">{session.owner_name}</p>
                  <p className="truncate text-xs text-muted-foreground">{session.owner_email}</p>
                </div>
                <StatusBadge status={status} />
              </div>
              <p className="text-sm">
                {session.device_name} · {session.platform}
              </p>
              <p className="text-xs text-muted-foreground">IP: {session.ip_address ?? "-"}</p>
              <p className="text-xs text-muted-foreground">
                Terakhir aktif {dateFormatter.format(new Date(session.last_active_at))}
              </p>
              {status === "ACTIVE" ? (
                <div className="flex flex-wrap gap-2">
                  <RevokeSessionButton sessionId={session.id} />
                  <RevokeAllSessionsButton userId={session.user_id} userName={session.owner_name} />
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      <div className="hidden overflow-x-auto rounded-lg border lg:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Pengguna</TableHead>
              <TableHead>Perangkat</TableHead>
              <TableHead>IP</TableHead>
              <TableHead>Terakhir Aktif</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-px" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {sessions.map((session) => {
              const status = sessionStatus(session);
              return (
                <TableRow key={session.id}>
                  <TableCell>
                    <p className="font-medium">{session.owner_name}</p>
                    <p className="text-xs text-muted-foreground">{session.owner_email}</p>
                  </TableCell>
                  <TableCell>
                    {session.device_name} · {session.platform}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{session.ip_address ?? "-"}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {dateFormatter.format(new Date(session.last_active_at))}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={status} />
                  </TableCell>
                  <TableCell>
                    {status === "ACTIVE" ? (
                      <div className="flex justify-end gap-2">
                        <RevokeSessionButton sessionId={session.id} />
                        <RevokeAllSessionsButton userId={session.user_id} userName={session.owner_name} />
                      </div>
                    ) : null}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </>
  );
}
