import { apiFetch } from "@/lib/api/client";
import type { SupportAgentFormValues } from "../schemas/support-agent.schema";
import type { AssignTicketFormValues, ResolveTicketFormValues } from "../schemas/ticket.schema";

export function createAgent(values: SupportAgentFormValues) {
  return apiFetch("/api/support/agents", {
    method: "POST",
    body: JSON.stringify(values),
  });
}

export function updateAgent(id: string, values: SupportAgentFormValues) {
  return apiFetch(`/api/support/agents/${id}`, {
    method: "PATCH",
    body: JSON.stringify(values),
  });
}

export function setAgentStatus(id: string, status: "ACTIVE" | "INACTIVE") {
  return apiFetch(`/api/support/agents/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}

export function assignTicket(id: string, values: AssignTicketFormValues) {
  return apiFetch(`/api/support/tickets/${id}/assign`, {
    method: "PATCH",
    body: JSON.stringify(values),
  });
}

export function resolveTicket(id: string, values: ResolveTicketFormValues) {
  return apiFetch(`/api/support/tickets/${id}/resolve`, {
    method: "PATCH",
    body: JSON.stringify(values),
  });
}
