import { findBumdesByAdminUserId } from "@/repositories/bumdes.repository";
import { createMitraComplaint } from "@/repositories/mitra-complaint.repository";
import { notifySuperAdmin } from "@/services/notification.service";

export interface SubmitMitraComplaintInput {
  actorUserId: string;
  subject: string;
  message: string;
}

// The BUMDES_ADMIN-authenticated counterpart to everything else this
// session built for Super Admin to act on — a real Mitra login (created
// by bumdes.service.ts's registerMitra) can call this today even though
// no Mitra portal page exists yet to put a form in front of it, the same
// "real engine, no UI trigger yet" shape as executeTransaction.
export async function submitMitraComplaint(input: SubmitMitraComplaintInput) {
  const subject = input.subject.trim();
  const message = input.message.trim();
  if (!subject || !message) {
    throw new Error("Subjek dan pesan keluhan wajib diisi");
  }

  const bumdes = await findBumdesByAdminUserId(input.actorUserId);
  if (!bumdes) {
    throw new Error("Akun ini tidak terdaftar sebagai admin mitra");
  }

  const complaint = await createMitraComplaint({ bumdes_id: bumdes.id, subject, message });

  await notifySuperAdmin(
    "MITRA_COMPLAINT",
    `Keluhan dari ${bumdes.name}`,
    `${subject}: ${message}`,
    "mitra_complaints",
    complaint.id,
  );

  return complaint;
}
