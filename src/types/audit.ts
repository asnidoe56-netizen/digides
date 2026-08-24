// Append-only — never updated or deleted (enforced by a DB trigger).
// old_value / new_value must never contain pin_hash, password_hash, or any
// other credential field; redaction happens in the repository before
// insert (see src/repositories/audit.repository.ts).
export interface AuditLog {
  id: string;
  actor_user_id: string | null;
  action: string;
  entity: string;
  entity_id: string;
  old_value: Record<string, unknown> | null;
  new_value: Record<string, unknown> | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: Date;
}

export interface CreateAuditLogInput {
  actor_user_id: string | null;
  action: string;
  entity: string;
  entity_id: string;
  old_value?: Record<string, unknown> | null;
  new_value?: Record<string, unknown> | null;
  ip_address?: string | null;
  user_agent?: string | null;
}
