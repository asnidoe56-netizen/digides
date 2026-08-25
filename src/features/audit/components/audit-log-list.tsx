import { EmptyState } from "@/components/empty-state";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { AuditLogWithActor } from "@/repositories/audit.repository";

const dateFormatter = new Intl.DateTimeFormat("id-ID", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
});

function ActionLabel({ action }: { action: string }) {
  return (
    <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
      {action.replaceAll("_", " ")}
    </span>
  );
}

function ValueDiff({ log }: { log: AuditLogWithActor }) {
  if (!log.old_value && !log.new_value) return null;
  return (
    <details className="text-xs">
      <summary className="cursor-pointer text-muted-foreground hover:text-foreground">Lihat detail</summary>
      <div className="mt-2 flex flex-col gap-2">
        {log.old_value ? (
          <div>
            <p className="font-medium text-muted-foreground">Sebelum</p>
            <pre className="overflow-x-auto rounded bg-muted p-2">{JSON.stringify(log.old_value, null, 2)}</pre>
          </div>
        ) : null}
        {log.new_value ? (
          <div>
            <p className="font-medium text-muted-foreground">Sesudah</p>
            <pre className="overflow-x-auto rounded bg-muted p-2">{JSON.stringify(log.new_value, null, 2)}</pre>
          </div>
        ) : null}
      </div>
    </details>
  );
}

export function AuditLogList({ logs }: { logs: AuditLogWithActor[] }) {
  if (logs.length === 0) {
    return <EmptyState title="Belum ada aktivitas" description="Aktivitas admin akan tercatat di sini." />;
  }

  return (
    <>
      <div className="flex flex-col gap-3 lg:hidden">
        {logs.map((log) => (
          <div key={log.id} className="flex flex-col gap-2 rounded-lg border p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate font-medium">{log.actor_name ?? "Sistem"}</p>
                {log.actor_email ? <p className="truncate text-xs text-muted-foreground">{log.actor_email}</p> : null}
              </div>
              <ActionLabel action={log.action} />
            </div>
            <p className="text-xs text-muted-foreground">
              {log.entity} · {log.entity_id}
            </p>
            <p className="text-xs text-muted-foreground">{dateFormatter.format(new Date(log.created_at))}</p>
            <ValueDiff log={log} />
          </div>
        ))}
      </div>

      <div className="hidden overflow-x-auto rounded-lg border lg:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Waktu</TableHead>
              <TableHead>Pelaku</TableHead>
              <TableHead>Aksi</TableHead>
              <TableHead>Entitas</TableHead>
              <TableHead>Detail</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs.map((log) => (
              <TableRow key={log.id}>
                <TableCell className="text-muted-foreground">
                  {dateFormatter.format(new Date(log.created_at))}
                </TableCell>
                <TableCell>
                  <p className="font-medium">{log.actor_name ?? "Sistem"}</p>
                  {log.actor_email ? <p className="text-xs text-muted-foreground">{log.actor_email}</p> : null}
                </TableCell>
                <TableCell>
                  <ActionLabel action={log.action} />
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {log.entity}
                  <p className="text-xs">{log.entity_id}</p>
                </TableCell>
                <TableCell>
                  <ValueDiff log={log} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  );
}
