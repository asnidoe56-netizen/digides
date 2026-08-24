import { countBumdes } from "@/repositories/bumdes.repository";
import { countKonters } from "@/repositories/konter.repository";
import { countUsers } from "@/repositories/user.repository";
import { getTotalPlatformBalance } from "@/repositories/wallet.repository";
import { listRecentAuditLogs } from "@/repositories/audit.repository";
import type { AuditLog } from "@/types/audit";

export interface SuperAdminDashboardSummary {
  totalBumdes: number;
  totalKonters: number;
  totalUsers: number;
  totalPlatformBalance: string;
}

// Aggregates counts/sums that span several domains (bumdes, konter, users,
// wallets) purely for the Super Admin dashboard — this doesn't belong to
// any single domain service (wallet.service, etc.), so it gets its own
// file rather than being bolted onto one of them.
export async function getSuperAdminDashboardSummary(): Promise<SuperAdminDashboardSummary> {
  const [totalBumdes, totalKonters, totalUsers, totalPlatformBalance] = await Promise.all([
    countBumdes(),
    countKonters(),
    countUsers(),
    getTotalPlatformBalance(),
  ]);

  return { totalBumdes, totalKonters, totalUsers, totalPlatformBalance };
}

export async function getRecentActivity(limit = 5): Promise<AuditLog[]> {
  return listRecentAuditLogs(limit);
}
