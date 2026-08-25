import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/empty-state";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { ReferralCodeWithDetail } from "@/repositories/referral.repository";
import { ReferralCodeStatusToggle } from "./referral-code-status-toggle";

const dateFormatter = new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", year: "numeric" });

export function ReferralCodeList({ codes }: { codes: ReferralCodeWithDetail[] }) {
  if (codes.length === 0) {
    return (
      <EmptyState
        title="Belum ada kode referral"
        description='Klik "Buat Kode Referral" untuk membuatkan kode bagi seorang pengguna.'
      />
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:hidden">
        {codes.map((code) => (
          <div key={code.id} className="flex flex-col gap-3 rounded-lg border p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate font-medium">{code.owner_name}</p>
                <p className="truncate text-xs text-muted-foreground">{code.owner_email}</p>
              </div>
              <Badge variant={code.is_active ? "default" : "outline"}>{code.is_active ? "Aktif" : "Nonaktif"}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <code className="rounded bg-muted px-2 py-1 text-sm font-medium tracking-wide">{code.code}</code>
              <p className="text-xs text-muted-foreground">{code.referred_count} direferensikan</p>
            </div>
            <ReferralCodeStatusToggle code={code} />
          </div>
        ))}
      </div>

      <div className="hidden overflow-x-auto rounded-lg border lg:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Pemilik</TableHead>
              <TableHead>Kode</TableHead>
              <TableHead className="text-right">Direferensikan</TableHead>
              <TableHead>Dibuat</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-px" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {codes.map((code) => (
              <TableRow key={code.id}>
                <TableCell>
                  <p className="font-medium">{code.owner_name}</p>
                  <p className="text-xs text-muted-foreground">{code.owner_email}</p>
                </TableCell>
                <TableCell>
                  <code className="rounded bg-muted px-2 py-1 text-sm font-medium tracking-wide">{code.code}</code>
                </TableCell>
                <TableCell className="text-right text-muted-foreground">{code.referred_count}</TableCell>
                <TableCell className="text-muted-foreground">{dateFormatter.format(new Date(code.created_at))}</TableCell>
                <TableCell>
                  <Badge variant={code.is_active ? "default" : "outline"}>{code.is_active ? "Aktif" : "Nonaktif"}</Badge>
                </TableCell>
                <TableCell>
                  <ReferralCodeStatusToggle code={code} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  );
}
