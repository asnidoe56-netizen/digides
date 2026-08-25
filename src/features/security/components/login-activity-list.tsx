import { EmptyState } from "@/components/empty-state";
import { StatusBadge } from "@/components/status-badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { LoginActivityWithDetail } from "@/repositories/login-activity.repository";

const dateFormatter = new Intl.DateTimeFormat("id-ID", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

const EVENT_LABEL: Record<string, string> = {
  LOGIN_SUCCESS: "Login Berhasil",
  LOGIN_FAILED: "Login Gagal",
  LOGOUT: "Logout",
  NEW_DEVICE: "Perangkat Baru",
  SESSION_REVOKED: "Sesi Dicabut",
  ACCOUNT_LOCKED: "Akun Dikunci",
};

// Read-only — every authentication event, success or failure, so an admin
// reconstructs "what happened to this account" without piecing it together
// from audit_logs (which only covers business-entity mutations).
export function LoginActivityList({ activities }: { activities: LoginActivityWithDetail[] }) {
  if (activities.length === 0) {
    return <EmptyState title="Belum ada aktivitas login" description="Riwayat login, logout, dan percobaan gagal akan muncul di sini." />;
  }

  return (
    <>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:hidden">
        {activities.map((activity) => (
          <div key={activity.id} className="flex flex-col gap-2 rounded-lg border p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate font-medium">{activity.owner_name ?? activity.attempted_email}</p>
                <p className="truncate text-xs text-muted-foreground">{activity.attempted_email}</p>
              </div>
              <StatusBadge status={activity.event_type} />
            </div>
            <p className="text-sm">{EVENT_LABEL[activity.event_type] ?? activity.event_type}</p>
            {activity.detail ? <p className="text-xs text-muted-foreground">{activity.detail}</p> : null}
            <p className="text-xs text-muted-foreground">
              {activity.ip_address ?? "IP tidak diketahui"} · {dateFormatter.format(new Date(activity.created_at))}
            </p>
          </div>
        ))}
      </div>

      <div className="hidden overflow-x-auto rounded-lg border lg:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Waktu</TableHead>
              <TableHead>Pengguna</TableHead>
              <TableHead>Peristiwa</TableHead>
              <TableHead>Perangkat</TableHead>
              <TableHead>IP</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {activities.map((activity) => (
              <TableRow key={activity.id}>
                <TableCell className="text-muted-foreground">
                  {dateFormatter.format(new Date(activity.created_at))}
                </TableCell>
                <TableCell>
                  <p className="font-medium">{activity.owner_name ?? "-"}</p>
                  <p className="text-xs text-muted-foreground">{activity.attempted_email}</p>
                </TableCell>
                <TableCell>
                  <p>{EVENT_LABEL[activity.event_type] ?? activity.event_type}</p>
                  {activity.detail ? <p className="text-xs text-muted-foreground">{activity.detail}</p> : null}
                </TableCell>
                <TableCell className="text-muted-foreground">{activity.device_name ?? "-"}</TableCell>
                <TableCell className="text-muted-foreground">{activity.ip_address ?? "-"}</TableCell>
                <TableCell>
                  <StatusBadge status={activity.event_type} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  );
}
