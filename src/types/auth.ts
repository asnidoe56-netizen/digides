export type PinStatus = "ACTIVE" | "LOCKED";

// Never select `pin_hash` outside the one repository function that verifies
// it — see UserTransactionPinForVerification below.
export interface UserTransactionPin {
  id: string;
  user_id: string;
  status: PinStatus;
  failed_attempts: number;
  locked_until: Date | null;
  pin_changed_at: Date;
  created_at: Date;
  updated_at: Date;
}

export interface UserTransactionPinForVerification extends UserTransactionPin {
  pin_hash: string;
}

export interface Session {
  userId: string;
  email: string;
  roles: string[];
}
