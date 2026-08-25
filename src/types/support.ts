export type SupportAgentRole = "AGENT" | "SUPERVISOR";
export type SupportAgentStatus = "ACTIVE" | "INACTIVE";

export interface SupportAgent {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  role: SupportAgentRole;
  status: SupportAgentStatus;
  created_at: Date;
  updated_at: Date;
}
