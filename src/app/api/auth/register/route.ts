import { NextResponse } from "next/server";
import { registerServerSchema } from "@/features/auth/schemas/register.schema";
import { assignRole, createUser, findUserByEmail } from "@/repositories/user.repository";
import { recordAuditLog } from "@/repositories/audit.repository";
import { hashPassword } from "@/lib/auth/password";

// Public self-registration always lands as AFFILIATE — SUPER_ADMIN,
// BUMDES_ADMIN, and KONTER accounts are provisioned by an admin, not
// self-signed-up (PRD role hierarchy, section 11).
const DEFAULT_ROLE = "AFFILIATE" as const;

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = registerServerSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Data tidak valid", issues: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const { full_name, email, phone, password } = parsed.data;

  const existing = await findUserByEmail(email);
  if (existing) {
    return NextResponse.json({ error: "Email sudah terdaftar" }, { status: 409 });
  }

  const password_hash = await hashPassword(password);
  const user = await createUser({ email, password_hash, full_name, phone: phone || null });
  await assignRole(user.id, DEFAULT_ROLE);

  await recordAuditLog({
    actor_user_id: user.id,
    action: "USER_REGISTERED",
    entity: "users",
    entity_id: user.id,
  });

  return NextResponse.json(
    { id: user.id, email: user.email, full_name: user.full_name },
    { status: 201 },
  );
}
