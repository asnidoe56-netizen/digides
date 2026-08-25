import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/session";
import { listUsers } from "@/repositories/user.repository";

// Typeahead for "pick a user" pickers (e.g. Referral menu's Buat Kode
// dialog) — returns only the safe subset, never the full user row
// (password_hash, etc.) that listUsers' `SELECT u.*` carries internally.
export async function GET(request: Request) {
  const session = await requireRole("SUPER_ADMIN");
  if (!session) {
    return NextResponse.json({ error: "Tidak diizinkan" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim();
  if (!q || q.length < 2) {
    return NextResponse.json({ users: [] });
  }

  const users = await listUsers({ search: q, limit: 10 });
  return NextResponse.json({
    users: users.map((user) => ({ id: user.id, full_name: user.full_name, email: user.email })),
  });
}
