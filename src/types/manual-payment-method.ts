import type { ManualTopupChannel } from "./payment";

export interface ManualPaymentMethod {
  id: string;
  code: ManualTopupChannel;
  display_name: string;
  account_number: string;
  account_name: string;
  is_active: boolean;
  sort_order: number;
  created_at: Date;
  updated_at: Date;
  updated_by: string | null;
}
