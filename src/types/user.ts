export type UserStatus = "ACTIVE" | "SUSPENDED" | "DELETED";

export interface User {
  id: string;
  email: string;
  phone: string | null;
  password_hash: string;
  full_name: string;
  status: UserStatus;
  created_at: Date;
  updated_at: Date;
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
