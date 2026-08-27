import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth/session";
import { recordAuditLog } from "@/repositories/audit.repository";
import { findUserByEmail, findUserById, findUserByPhone, updateUserProfile } from "@/repositories/user.repository";

const updateProfileSchema = z.object({
  fullName: z.string().trim().min(3, "Nama minimal 3 karakter").max(120),
  email: z.string().trim().min(1, "Email wajib diisi").email("Format email tidak valid"),
  phone: z
    .string()
    .trim()
    .regex(/^08[0-9]{8,12}$/, "Nomor WhatsApp tidak valid")
    .optional()
    .or(z.literal("")),
});

// Separate from PATCH /api/users/[id] (status only, by design) — this one
// edits identity fields instead, most commonly to fill in a WhatsApp
// number an account was created without (e.g. an AFFILIATE who
// self-registered with just email).
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || !session.roles.includes("SUPER_ADMIN")) {
    return NextResponse.json({ error: "Tidak diizinkan" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = updateProfileSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Data tidak valid", issues: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const existing = await findUserById(id);
  if (!existing) {
    return NextResponse.json({ error: "Pengguna tidak ditemukan" }, { status: 404 });
  }

  const phone = parsed.data.phone || null;

  const emailOwner = await findUserByEmail(parsed.data.email);
  if (emailOwner && emailOwner.id !== id) {
    return NextResponse.json({ error: "Email sudah digunakan pengguna lain" }, { status: 409 });
  }

  if (phone) {
    const phoneOwner = await findUserByPhone(phone);
    if (phoneOwner && phoneOwner.id !== id) {
      return NextResponse.json({ error: "Nomor WhatsApp sudah digunakan pengguna lain" }, { status: 409 });
    }
  }

  const updated = await updateUserProfile(id, {
    full_name: parsed.data.fullName,
    email: parsed.data.email,
    phone,
  });

  await recordAuditLog({
    actor_user_id: session.userId,
    action: "USER_PROFILE_UPDATED",
    entity: "users",
    entity_id: id,
    old_value: { full_name: existing.full_name, email: existing.email, phone: existing.phone },
    new_value: { full_name: parsed.data.fullName, email: parsed.data.email, phone },
  });

  return NextResponse.json({ user: updated });
}
