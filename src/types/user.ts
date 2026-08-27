export type UserStatus = "ACTIVE" | "SUSPENDED" | "DELETED";

export interface User {
  id: string;
  email: string;
  phone: string | null;
  password_hash: string;
  full_name: string;
  status: UserStatus;
  /** Set when brute-force login detection trips security_policies'
   *  max_login_attempts — login is rejected while this is in the future. */
  locked_until: Date | null;
  created_at: Date;
  updated_at: Date;
}

// The minimal, public-safe shape passed down to layout chrome (AppShell,
// nav components) — never the full `User` row (which has password_hash).
export interface UserSummary {
  full_name: string;
  email: string;
}

// The safe shape for anything that displays/edits a user's own identity
// fields (Super Admin's Edit Profil, the mitra self-service Profil page).
// Deliberately excludes password_hash/locked_until/status/timestamps —
// use this instead of the full `User` row anywhere one crosses an API
// response or a Server->Client Component prop boundary.
export interface PublicUserProfile {
  id: string;
  email: string;
  full_name: string;
  phone: string | null;
}

export type RoleCode = "SUPER_ADMIN" | "BUMDES_ADMIN" | "KONTER" | "AFFILIATE";

export interface Role {
  id: string;
  code: RoleCode;
  name: string;
}

export interface Permission {
  id: string;
  code: string;
  description: string | null;
}

export interface RolePermission {
  role_id: string;
  permission_id: string;
}

export interface UserRole {
  user_id: string;
  role_id: string;
  created_at: Date;
}
