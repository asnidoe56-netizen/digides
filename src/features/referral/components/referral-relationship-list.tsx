import { ArrowRight } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { StatusBadge } from "@/components/status-badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { ReferralRelationshipWithDetail } from "@/repositories/referral.repository";
import { ReferralRelationshipStatusToggle } from "./referral-relationship-status-toggle";

export function ReferralRelationshipList({ relationships }: { relationships: ReferralRelationshipWithDetail[] }) {
  if (relationships.length === 0) {
    return (
      <EmptyState
        title="Belum ada relasi referral"
        description="Relasi terbentuk otomatis saat seseorang mendaftar menggunakan kode referral orang lain."
      />
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:hidden">
        {relationships.map((relationship) => (
          <div key={relationship.id} className="flex flex-col gap-3 rounded-lg border p-4">
            <div className="flex items-center gap-2 text-sm">
              <span className="min-w-0 truncate font-medium">{relationship.referrer_name}</span>
              <ArrowRight className="size-3.5 shrink-0 text-muted-foreground" />
              <span className="min-w-0 truncate font-medium">{relationship.referred_name}</span>
            </div>
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">Level {relationship.level}</p>
              <StatusBadge status={relationship.status} />
            </div>
            <ReferralRelationshipStatusToggle relationship={relationship} />
          </div>
        ))}
      </div>

      <div className="hidden overflow-x-auto rounded-lg border lg:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Referrer</TableHead>
              <TableHead>Direferensikan</TableHead>
              <TableHead>Level</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-px" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {relationships.map((relationship) => (
              <TableRow key={relationship.id}>
                <TableCell>
                  <p className="font-medium">{relationship.referrer_name}</p>
                  <p className="text-xs text-muted-foreground">{relationship.referrer_email}</p>
                </TableCell>
                <TableCell>
                  <p className="font-medium">{relationship.referred_name}</p>
                  <p className="text-xs text-muted-foreground">{relationship.referred_email}</p>
                </TableCell>
                <TableCell className="text-muted-foreground">{relationship.level}</TableCell>
                <TableCell>
                  <StatusBadge status={relationship.status} />
                </TableCell>
                <TableCell>
                  <ReferralRelationshipStatusToggle relationship={relationship} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  );
}
