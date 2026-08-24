import { z } from "zod";

// Shared between LoginForm (client, for UX) and POST /api/auth/login
// (server, the actual security boundary) — issue M03 section 16.
export const loginSchema = z.object({
  email: z.string().min(1, "Email wajib diisi").email("Format email tidak valid"),
  password: z.string().min(1, "Password wajib diisi"),
});

export type LoginFormValues = z.infer<typeof loginSchema>;
