import { withTransaction } from "@/lib/db/transaction";
import { hashPassword } from "@/lib/auth/password";
import { hashPin } from "@/lib/auth/pin";
import { recordAuditLog } from "@/repositories/audit.repository";
import { createBumdes, listBumdesWithDetail } from "@/repositories/bumdes.repository";
import { createReferralRelationship, findReferralCodeByCode } from "@/repositories/referral.repository";
import { assignRole, createTransactionPin, createUser, findUserByEmail, findUserByPhone } from "@/repositories/user.repository";
import { provisionWalletForAccount } from "@/repositories/wallet.repository";

export async function getMitraList() {
  return listBumdesWithDetail();
}

export interface RegisterMitraInput {
  name: string;
  address?: string | null;
  email: string;
  /** Persisted as users.phone — doubles as this Mitra's alternate login
   *  identifier alongside email (see /api/auth/login). */
  whatsapp: string;
  password: string;
  pin: string;
  /** An existing referral_codes.code — its owner becomes this Mitra's referrer. */
  referralCode?: string | null;
  actorUserId: string;
}

// Mitra (BUMDes) accounts are always provisioned by a Super Admin, never
// self-registered (mirrors POST /api/auth/register's AFFILIATE-only rule
// for public sign-up). One request creates the login (users), the PIN
// used to confirm transactions (user_transaction_pins), the BUMDes
// record itself, its wallet, and — if a referralCode was given — its
// referral_relationships row, all together. A partial failure here must
// never leave a Mitra without a wallet or a login without a PIN.
export async function registerMitra(input: RegisterMitraInput) {
  const existing = await findUserByEmail(input.email);
  if (existing) {
    throw new Error("Email sudah terdaftar");
  }

  const existingPhone = await findUserByPhone(input.whatsapp);
  if (existingPhone) {
    throw new Error("Nomor WhatsApp sudah terdaftar");
  }

  const referralCode = input.referralCode?.trim() || null;
  const referrer = referralCode ? await findReferralCodeByCode(referralCode) : null;
  if (referralCode && !referrer) {
    throw new Error("Kode referensi tidak ditemukan");
  }

  const [password_hash, pin_hash] = await Promise.all([hashPassword(input.password), hashPin(input.pin)]);

  return withTransaction(async (client) => {
    const user = await createUser(
      { email: input.email, password_hash, full_name: input.name, phone: input.whatsapp },
      client,
    );
    await assignRole(user.id, "BUMDES_ADMIN", client);
    await createTransactionPin(user.id, pin_hash, client);

    if (referrer) {
      await createReferralRelationship(referrer.user_id, user.id, client);
    }

    const bumdes = await createBumdes({ name: input.name, admin_user_id: user.id, address: input.address }, client);
    const { wallet } = await provisionWalletForAccount({ account_type: "BUMDES", bumdes_id: bumdes.id }, client);

    await recordAuditLog(
      {
        actor_user_id: input.actorUserId,
        action: "MITRA_REGISTERED",
        entity: "bumdes",
        entity_id: bumdes.id,
        new_value: { name: bumdes.name, admin_email: user.email, referral_code: referralCode },
      },
      client,
    );

    return { bumdes, user: { id: user.id, email: user.email, full_name: user.full_name }, wallet };
  });
}
