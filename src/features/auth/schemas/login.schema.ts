import { z } from "zod";

// Shared between LoginForm (client, for UX) and POST /api/auth/login
// (server, the actual security boundary) — issue M03 section 16.
// `identifier` accepts either a registered email or a registered
// users.phone (WhatsApp) number — the route decides which lookup to run
// based on whether it contains "@", so one field covers both without the
// user picking a mode up front.
export const loginSchema = z.object({
  identifier: z.string().trim().min(1, "Email atau nomor WhatsApp wajib diisi"),
  password: z.string().min(1, "Password wajib diisi"),
});

export type LoginFormValues = z.infer<typeof loginSchema>;
