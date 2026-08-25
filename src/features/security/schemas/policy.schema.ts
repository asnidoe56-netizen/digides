import { z } from "zod";

export const securityPolicySchema = z.object({
  max_devices_per_user: z.coerce.number().int().min(1, "Minimal 1").max(50, "Maksimal 50"),
  max_login_attempts: z.coerce.number().int().min(1, "Minimal 1").max(20, "Maksimal 20"),
  login_lockout_minutes: z.coerce.number().int().min(1, "Minimal 1 menit").max(1440, "Maksimal 1440 menit"),
  require_device_verification: z.boolean(),
  session_timeout_minutes: z.coerce.number().int().min(5, "Minimal 5 menit").max(43200, "Maksimal 43200 menit"),
  max_pin_attempts: z.coerce.number().int().min(1, "Minimal 1").max(10, "Maksimal 10"),
  pin_lockout_minutes: z.coerce.number().int().min(1, "Minimal 1 menit").max(1440, "Maksimal 1440 menit"),
});

export type SecurityPolicyFormValues = z.infer<typeof securityPolicySchema>;
