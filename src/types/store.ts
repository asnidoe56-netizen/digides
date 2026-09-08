export type StoreStatus = "DRAFT" | "SUBMITTED" | "ACTIVE" | "SUSPENDED" | "CLOSED";

// One row per warung — owner_user_id is UNIQUE (one store per owner in the
// MVP, see 044_stores.sql). Address reuses the wilayah reference table the
// same way users' registration address does.
export interface Store {
  id: string;
  owner_user_id: string;
  name: string;
  status: StoreStatus;
  province_code: string | null;
  regency_code: string | null;
  district_code: string | null;
  village_code: string | null;
  address_detail: string | null;
  submitted_at: Date | null;
  verified_at: Date | null;
  verified_by: string | null;
  created_at: Date;
  updated_at: Date;
}
