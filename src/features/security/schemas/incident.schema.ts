import { z } from "zod";

export const incidentStatusSchema = z.object({
  status: z.enum(["INVESTIGATING", "RESOLVED", "DISMISSED"]),
  note: z.string().trim().max(1000).optional(),
});

export type IncidentStatusFormValues = z.infer<typeof incidentStatusSchema>;

export const resolveIncidentSchema = z.object({
  note: z.string().trim().min(5, "Catatan minimal 5 karakter").max(1000),
});

export type ResolveIncidentFormValues = z.infer<typeof resolveIncidentSchema>;
