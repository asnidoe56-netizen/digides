import { EmptyState } from "@/components/empty-state";
import { StatusBadge } from "@/components/status-badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { UserDeviceWithOwner } from "@/repositories/user-device.repository";
import { RevokeDeviceButton } from "./revoke-device-button";

const dateFormatter = new Intl.DateTimeFormat("id-ID", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

export function DeviceList({ devices }: { devices: UserDeviceWithOwner[] }) {
  if (devices.length === 0) {
    return (
      <EmptyState
        title="Tidak ada perangkat aktif"
        description="Perangkat yang sedang memiliki akses ke akun akan muncul di sini."
      />
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:hidden">
        {devices.map((device) => (
          <div key={device.id} className="flex flex-col gap-2 rounded-lg border p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate font-medium">{device.owner_name}</p>
                <p className="truncate text-xs text-muted-foreground">{device.owner_email}</p>
              </div>
              <StatusBadge status={device.trust_status} />
            </div>
            <p className="text-sm">{device.device_name}</p>
            <p className="text-xs text-muted-foreground">
              {device.platform} · {device.last_ip ?? "IP tidak diketahui"} · {device.active_session_count} sesi aktif
            </p>
            <p className="text-xs text-muted-foreground">Terakhir aktif {dateFormatter.format(new Date(device.last_seen_at))}</p>
            <RevokeDeviceButton deviceId={device.id} deviceName={device.device_name} />
          </div>
        ))}
      </div>

      <div className="hidden overflow-x-auto rounded-lg border lg:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Pengguna</TableHead>
              <TableHead>Perangkat</TableHead>
              <TableHead>Platform</TableHead>
              <TableHead>IP Terakhir</TableHead>
              <TableHead>Aktivitas Terakhir</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-px" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {devices.map((device) => (
              <TableRow key={device.id}>
                <TableCell>
                  <p className="font-medium">{device.owner_name}</p>
                  <p className="text-xs text-muted-foreground">{device.owner_email}</p>
                </TableCell>
                <TableCell>{device.device_name}</TableCell>
                <TableCell className="text-muted-foreground">{device.platform}</TableCell>
                <TableCell className="text-muted-foreground">{device.last_ip ?? "-"}</TableCell>
                <TableCell className="text-muted-foreground">
                  {dateFormatter.format(new Date(device.last_seen_at))}
                </TableCell>
                <TableCell>
                  <StatusBadge status={device.trust_status} />
                </TableCell>
                <TableCell>
                  <div className="flex justify-end">
                    <RevokeDeviceButton deviceId={device.id} deviceName={device.device_name} />
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
