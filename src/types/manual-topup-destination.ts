export interface ManualTopupDestination {
  id: string;
  dana_number: string;
  dana_account_name: string;
  bank_name: string;
  bank_account_number: string;
  bank_account_name: string;
  updated_at: Date;
  updated_by: string | null;
}
