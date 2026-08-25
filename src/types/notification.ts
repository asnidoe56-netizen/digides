export type NotificationType =
  | "MITRA_TOPUP_REQUESTED"
  | "MITRA_COMPLAINT"
  | "RECONCILIATION_ISSUE"
  | "MIDTRANS_TOPUP_FAILED";

export interface Notification {
  id: string;
  recipient_role: string;
  type: NotificationType;
  title: string;
  body: string | null;
  entity: string | null;
  entity_id: string | null;
  is_read: boolean;
  created_at: Date;
}

export type MitraComplaintStatus = "OPEN" | "RESOLVED";

export interface MitraComplaint {
  id: string;
  bumdes_id: string;
  subject: string;
  message: string;
  status: MitraComplaintStatus;
  assigned_agent_id: string | null;
  created_at: Date;
  resolved_at: Date | null;
  resolution_note: string | null;
}
