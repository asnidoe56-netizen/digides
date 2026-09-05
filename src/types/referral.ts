// "Mitra" is a status a code's owner holds, not a user_roles entry — any
// AFFILIATE, BUMDES_ADMIN, or KONTER can be granted either one. It's what
// the commission engine looks up to decide a direct referral's reward
// rate (see commission.service.ts's awardCommissionForTransaction).
export type ReferralCodeHolderStatus = "USER" | "MITRA";

export interface ReferralCode {
  id: string;
  user_id: string;
  code: string;
  is_active: boolean;
  holder_status: ReferralCodeHolderStatus;
  created_at: Date;
  expires_at: Date | null;
}

export type ReferralRelationshipStatus = "ACTIVE" | "BLOCKED";

// One row = one edge in the referral forest. `referred_id` is UNIQUE, so
// every user has exactly one parent, set once — see Architecture notes in
// the M02 planning doc for why this keeps the structure cycle-free without
// a recursive DB constraint.
export interface ReferralRelationship {
  id: string;
  referrer_id: string;
  referred_id: string;
  level: number;
  status: ReferralRelationshipStatus;
  created_at: Date;
}
