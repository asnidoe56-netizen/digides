import { z } from "zod";

export const assignTicketSchema = z.object({
  agentId: z.string().uuid("Pilih agen yang valid"),
});

export const resolveTicketSchema = z.object({
  note: z.string().trim().min(5, "Catatan minimal 5 karakter").max(1000),
});

export type AssignTicketFormValues = z.infer<typeof assignTicketSchema>;
export type ResolveTicketFormValues = z.infer<typeof resolveTicketSchema>;
