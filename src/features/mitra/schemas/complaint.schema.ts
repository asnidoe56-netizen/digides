import { z } from "zod";

export const complaintSchema = z.object({
  subject: z.string().trim().min(3, "Subjek minimal 3 karakter").max(150),
  message: z.string().trim().min(10, "Pesan minimal 10 karakter").max(2000),
});

export type ComplaintFormValues = z.infer<typeof complaintSchema>;
