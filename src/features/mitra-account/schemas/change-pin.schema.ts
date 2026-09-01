import { z } from "zod";

// Same 6-digit shape /api/transactions/execute validates a purchase PIN
// against (see executeSchema in that route) — a transaction PIN is always
// exactly 6 digits everywhere in this app.
const pinField = (message: string) => z.string().regex(/^[0-9]{6}$/, message);

export const changePinServerSchema = z
  .object({
    currentPin: pinField("PIN saat ini harus 6 digit angka"),
    newPin: pinField("PIN baru harus 6 digit angka"),
  })
  .refine((data) => data.newPin !== data.currentPin, {
    message: "PIN baru harus berbeda dari PIN saat ini",
    path: ["newPin"],
  });

export const changePinFormSchema = z
  .object({
    currentPin: pinField("PIN saat ini harus 6 digit angka"),
    newPin: pinField("PIN baru harus 6 digit angka"),
    confirmPin: pinField("Konfirmasi PIN harus 6 digit angka"),
  })
  .refine((data) => data.newPin === data.confirmPin, {
    message: "Konfirmasi PIN tidak cocok",
    path: ["confirmPin"],
  })
  .refine((data) => data.newPin !== data.currentPin, {
    message: "PIN baru harus berbeda dari PIN saat ini",
    path: ["newPin"],
  });

export type ChangePinValues = z.infer<typeof changePinFormSchema>;
export type ChangePinServerInput = z.infer<typeof changePinServerSchema>;
