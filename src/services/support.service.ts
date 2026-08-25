import { recordAuditLog } from "@/repositories/audit.repository";
import {
  assignMitraComplaint,
  countMitraComplaints,
  findMitraComplaintById,
  listMitraComplaints,
  resolveMitraComplaint,
  type ListMitraComplaintsFilter,
} from "@/repositories/mitra-complaint.repository";
import {
  createSupportAgent,
  findSupportAgentById,
  listActiveSupportAgents,
  listSupportAgentsWithWorkload,
  setSupportAgentStatus,
  updateSupportAgent,
  type CreateSupportAgentInput,
  type UpdateSupportAgentInput,
} from "@/repositories/support-agent.repository";
import type { SupportAgentStatus } from "@/types/support";

const UNIQUE_VIOLATION = "23505";

function isUniqueViolation(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === UNIQUE_VIOLATION;
}

export async function getSupportOverview() {
  const [agents, openTickets, resolvedTickets] = await Promise.all([
    listSupportAgentsWithWorkload(),
    countMitraComplaints({ status: "OPEN" }),
    countMitraComplaints({ status: "RESOLVED" }),
  ]);

  return {
    activeAgentCount: agents.filter((agent) => agent.status === "ACTIVE").length,
    openTickets,
    resolvedTickets,
  };
}

export async function getSupportAgents() {
  return listSupportAgentsWithWorkload();
}

export async function getActiveSupportAgentOptions() {
  return listActiveSupportAgents();
}

export async function addSupportAgent(input: CreateSupportAgentInput, actorUserId: string) {
  let agent;
  try {
    agent = await createSupportAgent(input);
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new Error("Agen dengan email ini sudah terdaftar");
    }
    throw error;
  }

  await recordAuditLog({
    actor_user_id: actorUserId,
    action: "SUPPORT_AGENT_ADDED",
    entity: "support_agents",
    entity_id: agent.id,
    new_value: { full_name: agent.full_name, email: agent.email, role: agent.role },
  });

  return agent;
}

export async function updateSupportAgentAndAudit(
  id: string,
  input: UpdateSupportAgentInput,
  actorUserId: string,
) {
  let agent;
  try {
    agent = await updateSupportAgent(id, input);
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new Error("Agen dengan email ini sudah terdaftar");
    }
    throw error;
  }
  if (!agent) {
    throw new Error("Agen tidak ditemukan");
  }

  await recordAuditLog({
    actor_user_id: actorUserId,
    action: "SUPPORT_AGENT_UPDATED",
    entity: "support_agents",
    entity_id: agent.id,
    new_value: { full_name: agent.full_name, email: agent.email, role: agent.role },
  });

  return agent;
}

export async function setSupportAgentStatusAndAudit(
  id: string,
  status: SupportAgentStatus,
  actorUserId: string,
) {
  const agent = await setSupportAgentStatus(id, status);
  if (!agent) {
    throw new Error("Agen tidak ditemukan");
  }

  await recordAuditLog({
    actor_user_id: actorUserId,
    action: status === "ACTIVE" ? "SUPPORT_AGENT_ACTIVATED" : "SUPPORT_AGENT_DEACTIVATED",
    entity: "support_agents",
    entity_id: agent.id,
  });

  return agent;
}

export async function getTickets(filter: ListMitraComplaintsFilter = {}) {
  return listMitraComplaints(filter);
}

export async function getTicketCount(filter: ListMitraComplaintsFilter = {}) {
  return countMitraComplaints(filter);
}

export async function assignTicket(ticketId: string, agentId: string, actorUserId: string) {
  const agent = await findSupportAgentById(agentId);
  if (!agent || agent.status !== "ACTIVE") {
    throw new Error("Agen tidak aktif atau tidak ditemukan");
  }

  const complaint = await assignMitraComplaint(ticketId, agentId);
  if (!complaint) {
    throw new Error("Tiket tidak ditemukan");
  }

  await recordAuditLog({
    actor_user_id: actorUserId,
    action: "SUPPORT_TICKET_ASSIGNED",
    entity: "mitra_complaints",
    entity_id: complaint.id,
    new_value: { agent_id: agentId, agent_name: agent.full_name },
  });

  return complaint;
}

export async function resolveTicket(ticketId: string, note: string, actorUserId: string) {
  const trimmed = note.trim();
  if (!trimmed) {
    throw new Error("Catatan penyelesaian wajib diisi");
  }

  const existing = await findMitraComplaintById(ticketId);
  if (!existing) {
    throw new Error("Tiket tidak ditemukan");
  }
  if (existing.status !== "OPEN") {
    throw new Error("Tiket ini sudah diselesaikan sebelumnya");
  }

  const complaint = await resolveMitraComplaint(ticketId, trimmed);
  if (!complaint) {
    throw new Error("Tiket sudah diproses oleh proses lain, silakan muat ulang");
  }

  await recordAuditLog({
    actor_user_id: actorUserId,
    action: "SUPPORT_TICKET_RESOLVED",
    entity: "mitra_complaints",
    entity_id: complaint.id,
    new_value: { note: trimmed },
  });

  return complaint;
}
