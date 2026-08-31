import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth/session";
import { recordAuditLog } from "@/repositories/audit.repository";
import {
  findUserByEmail,
  findUserById,
  findUserByPhone,
  toPublicUserProfile,
  updateUserProfile,
} from "@/repositories/user.repository";

// The mobile app's Akun > Profil screen (and its session-restore-on-launch
// bootstrap, which — unlike a fresh login — has no other way to learn the
// caller's roles again) — login's response omits `phone`, so this is the
// one place to fetch the caller's own full public profile.
export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Tidak diizinkan" }, { status: 403 });
  }

  const user = await findUserById(session.userId);
  if (!user) {
    return NextResponse.json({ error: "Pengguna tidak ditemukan" }, { status: 404 });
  }

  return NextResponse.json({ user: toPublicUserProfile(user), roles: session.roles });
}

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

// The mitra-facing counterpart to PATCH /api/users/[id]/profile — same
// validation and duplicate checks, but always scoped to session.userId
// (never a client-supplied id, any logged-in role), so a user can only
// ever edit their own account. Writes the exact same users row Super
// Admin's Pengguna > Lihat Detail > Edit Profil reads and writes, so an
// update from either side is immediately visible to the other.
export async function PATCH(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Tidak diizinkan" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = updateProfileSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Data tidak valid", issues: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const existing = await findUserById(session.userId);
  if (!existing) {
    return NextResponse.json({ error: "Pengguna tidak ditemukan" }, { status: 404 });
  }

  const phone = parsed.data.phone || null;

  const emailOwner = await findUserByEmail(parsed.data.email);
  if (emailOwner && emailOwner.id !== session.userId) {
    return NextResponse.json({ error: "Email sudah digunakan pengguna lain" }, { status: 409 });
  }

  if (phone) {
    const phoneOwner = await findUserByPhone(phone);
    if (phoneOwner && phoneOwner.id !== session.userId) {
      return NextResponse.json({ error: "Nomor WhatsApp sudah digunakan pengguna lain" }, { status: 409 });
    }
  }

  const updated = await updateUserProfile(session.userId, {
    full_name: parsed.data.fullName,
    email: parsed.data.email,
    phone,
  });
  if (!updated) {
    return NextResponse.json({ error: "Pengguna tidak ditemukan" }, { status: 404 });
  }

  await recordAuditLog({
    actor_user_id: session.userId,
    action: "USER_PROFILE_UPDATED",
    entity: "users",
    entity_id: session.userId,
    old_value: { full_name: existing.full_name, email: existing.email, phone: existing.phone },
    new_value: { full_name: parsed.data.fullName, email: parsed.data.email, phone },
  });

  return NextResponse.json({ user: toPublicUserProfile(updated) });
}
