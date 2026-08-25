import {
  countAuditLogsFiltered,
  listAuditLogsFiltered,
  listDistinctAuditEntities,
  type ListAuditLogsFilter,
} from "@/repositories/audit.repository";

export async function getAuditLogs(filter: ListAuditLogsFilter = {}) {
  return listAuditLogsFiltered(filter);
}

export async function getAuditLogCount(filter: ListAuditLogsFilter = {}) {
  return countAuditLogsFiltered(filter);
}

export async function getAuditEntityOptions() {
  return listDistinctAuditEntities();
}
