import { apiFetch } from "@/lib/api/client";
import type { RegisterServerInput } from "../schemas/register.schema";
import type { LoginFormValues } from "../schemas/login.schema";

export interface AuthUser {
  id: string;
  email: string;
  full_name: string;
  roles?: string[];
}

export function registerUser(input: RegisterServerInput): Promise<AuthUser> {
  return apiFetch<AuthUser>("/api/auth/register", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function loginUser(input: LoginFormValues): Promise<AuthUser> {
  return apiFetch<AuthUser>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify(input),
  });
}
