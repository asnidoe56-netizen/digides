import { NextResponse } from "next/server";
import { registerServerSchema } from "@/features/auth/schemas/register.schema";
import { assignRole, createTransactionPin, createUser, findUserByEmail } from "@/repositories/user.repository";
import { provisionWalletForAccount } from "@/repositories/wallet.repository";
import { createReferralRelationship, findReferralCodeByCode } from "@/repositories/referral.repository";
import { recordAuditLog } from "@/repositories/audit.repository";
import { hashPassword } from "@/lib/auth/password";
import { hashPin } from "@/lib/auth/pin";
import { withTransaction } from "@/lib/db/transaction";
import { CURRENT_TERMS_VERSION } from "@/lib/legal/terms";

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

  const { full_name, email, phone, password, pin, referralCode: rawReferralCode } = parsed.data;

  const existing = await findUserByEmail(email);
  if (existing) {
    return NextResponse.json({ error: "Email sudah terdaftar" }, { status: 409 });
  }

  // Same referral_codes lookup registerMitra (bumdes.service.ts) uses — an
  // unknown/inactive/expired code is rejected up front rather than silently
  // registering the account with no referrer.
  const referralCode = rawReferralCode?.trim() || null;
  const referrer = referralCode ? await findReferralCodeByCode(referralCode) : null;
  if (referralCode && !referrer) {
    return NextResponse.json({ error: "Kode referensi tidak ditemukan" }, { status: 400 });
  }

  const password_hash = await hashPassword(password);
  const pin_hash = await hashPin(pin);

  // User creation, role assignment, wallet provisioning, PIN setup, and the
  // referral link (if any) happen together — a user account should never
  // exist without the wallet an AFFILIATE needs to receive commission (M18
  // section 9's onboarding note), a PIN to confirm transactions with
  // (without one set here, there'd be no way to set it later — Ganti PIN
  // requires proving the *current* PIN first), or — if a referral code was
  // given — its referral_relationships row. A partial failure here
  // shouldn't leave a user with no role, no wallet, no PIN, or a silently
  // dropped referral.
  const user = await withTransaction(async (client) => {
    const createdUser = await createUser(
      {
        email,
        password_hash,
        full_name,
        phone: phone || null,
        terms_accepted_at: new Date(),
        terms_version: CURRENT_TERMS_VERSION,
      },
      client,
    );
    await assignRole(createdUser.id, DEFAULT_ROLE, client);
    await provisionWalletForAccount({ account_type: "USER", user_id: createdUser.id }, client);
    await createTransactionPin(createdUser.id, pin_hash, client);

    if (referrer) {
      await createReferralRelationship(referrer.user_id, createdUser.id, client);
    }

    await recordAuditLog(
      {
        actor_user_id: createdUser.id,
        action: "USER_REGISTERED",
        entity: "users",
        entity_id: createdUser.id,
        new_value: { referral_code: referralCode },
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
