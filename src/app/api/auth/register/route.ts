import { NextResponse } from "next/server";
import { registerServerSchema } from "@/features/auth/schemas/register.schema";
import { assignRole, createUser, findUserByEmail } from "@/repositories/user.repository";
import { provisionWalletForAccount } from "@/repositories/wallet.repository";
import { recordAuditLog } from "@/repositories/audit.repository";
import { hashPassword } from "@/lib/auth/password";
import { withTransaction } from "@/lib/db/transaction";

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

  // User creation, role assignment, and wallet provisioning happen
  // together — a user account should never exist without the wallet an
  // AFFILIATE needs to receive commission (M18 section 9's onboarding
  // note), and a partial failure here shouldn't leave a user with no role
  // or no wallet.
  const user = await withTransaction(async (client) => {
    const createdUser = await createUser({ email, password_hash, full_name, phone: phone || null }, client);
    await assignRole(createdUser.id, DEFAULT_ROLE, client);
    await provisionWalletForAccount({ account_type: "USER", user_id: createdUser.id }, client);

    await recordAuditLog(
      {
        actor_user_id: createdUser.id,
        action: "USER_REGISTERED",
        entity: "users",
        entity_id: createdUser.id,
      },
      client,
    );

    return createdUser;
  });

  return NextResponse.json(
    { id: user.id, email: user.email, full_name: user.full_name },
    { status: 201 },
  );
}
