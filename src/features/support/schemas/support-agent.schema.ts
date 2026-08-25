import { z } from "zod";

export const supportAgentSchema = z.object({
  full_name: z.string().trim().min(3, "Nama minimal 3 karakter").max(120),
  email: z.string().trim().min(1, "Email wajib diisi").email("Format email tidak valid"),
  phone: z
    .string()
    .trim()
    .regex(/^[0-9]{9,15}$/, "Nomor HP harus 9-15 digit angka")
    .optional()
    .or(z.literal("")),
  role: z.enum(["AGENT", "SUPERVISOR"], { message: "Pilih peran agen" }),
});

export type SupportAgentFormValues = z.infer<typeof supportAgentSchema>;
