import { EmptyState } from "@/components/empty-state";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { UserDeviceWithOwner } from "@/repositories/user-device.repository";
import { DeviceTrustSelect } from "./device-trust-select";

const dateFormatter = new Intl.DateTimeFormat("id-ID", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

// Every device regardless of trust level — where Super Admin approves a
// PENDING device, blocks a suspicious one, or restores a previously
// revoked one. "Perangkat Aktif" (device-list.tsx) is the narrower,
// TRUSTED-only view with a quick one-click revoke action instead.
export function DeviceManagementList({ devices }: { devices: UserDeviceWithOwner[] }) {
  if (devices.length === 0) {
    return <EmptyState title="Belum ada perangkat" description="Perangkat yang pernah login akan muncul di sini." />;
  }

  return (
    <>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:hidden">
        {devices.map((device) => (
          <div key={device.id} className="flex flex-col gap-2 rounded-lg border p-4">
            <div className="min-w-0">
              <p className="truncate font-medium">{device.owner_name}</p>
              <p className="truncate text-xs text-muted-foreground">{device.owner_email}</p>
            </div>
            <p className="text-sm">
              {device.device_name} · {device.platform}
            </p>
            <p className="text-xs text-muted-foreground">
              Pertama terlihat {dateFormatter.format(new Date(device.first_seen_at))}
            </p>
            <DeviceTrustSelect deviceId={device.id} status={device.trust_status} />
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
              <TableHead>Pertama Terlihat</TableHead>
              <TableHead>Tingkat Kepercayaan</TableHead>
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
                <TableCell className="text-muted-foreground">
                  {dateFormatter.format(new Date(device.first_seen_at))}
                </TableCell>
                <TableCell>
                  <DeviceTrustSelect deviceId={device.id} status={device.trust_status} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  );
}
