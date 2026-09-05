import { recordAuditLog } from "@/repositories/audit.repository";
import {
  createReferralCode,
  findReferralCodeByUserId,
  insertReferralCodeWithRetry,
  listDirectDownlines,
  listReferralCodes,
  listReferralRelationships,
  setReferralCodeActive,
  setReferralCodeHolderStatus as updateReferralCodeHolderStatusRow,
  setReferralRelationshipStatus as updateReferralRelationshipStatusRow,
} from "@/repositories/referral.repository";
import { findUserById } from "@/repositories/user.repository";
import { getWalletForMitraSession } from "@/services/wallet.service";
import { maskBalance } from "@/lib/formatting/money";
import type { ReferralCodeHolderStatus, ReferralRelationshipStatus } from "@/types/referral";

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I — avoids misreads when shared aloud

function randomReferralCode(): string {
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  }
  return code;
}

export async function getReferralCodes() {
  return listReferralCodes();
}

export async function getReferralRelationships() {
  return listReferralRelationships();
}

export interface GenerateReferralCodeInput {
  userId: string;
  /** Admin-chosen code; auto-generated when omitted. */
  customCode?: string | null;
  actorUserId: string;
}

// One code per user (referral_codes.user_id is UNIQUE) — calling this for
// a user who already has one just returns it unchanged, so the "Buat Kode"
// action is safe to click more than once.
export async function generateReferralCode(input: GenerateReferralCodeInput) {
  const user = await findUserById(input.userId);
  if (!user) {
    throw new Error("Pengguna tidak ditemukan");
  }

  const existing = await findReferralCodeByUserId(input.userId);
  if (existing) {
    return existing;
  }

  const customCode = input.customCode?.trim().toUpperCase() || null;
  let code;
  try {
    code = customCode
      ? await createReferralCode(input.userId, customCode)
      : await insertReferralCodeWithRetry(input.userId, randomReferralCode);
  } catch (error) {
    if (customCode) {
      throw new Error("Kode referensi sudah digunakan, coba kode lain");
    }
    throw error;
  }

  await recordAuditLog({
    actor_user_id: input.actorUserId,
    action: "REFERRAL_CODE_CREATED",
    entity: "referral_codes",
    entity_id: code.id,
    new_value: { user_id: input.userId, code: code.code },
  });

  return code;
}

export interface DownlineWithMaskedBalance {
  relationship_id: string;
  full_name: string;
  email: string;
  status: ReferralRelationshipStatus;
  joined_at: Date;
  roleLabel: string;
  maskedBalance: string;
}

const ROLE_LABEL: Record<string, string> = {
  BUMDES_ADMIN: "Mitra",
  KONTER: "Agen",
  AFFILIATE: "Afiliasi",
  SUPER_ADMIN: "Super Admin",
};

// Menu Mitra's own view: BUMDES_ADMIN/KONTER self-service — their own
// referral code (created on first visit if they don't have one yet,
// generateReferralCode() is idempotent) plus every direct downline's
// balance, masked down to its thousands-group (money.ts's maskBalance) so
// an upline can gauge activity without seeing a downline's exact figure.
export async function getMitraOverview(userId: string) {
  const referralCode = await generateReferralCode({ userId, actorUserId: userId });
  const downlines = await listDirectDownlines(userId);

  const withBalance: DownlineWithMaskedBalance[] = await Promise.all(
    downlines.map(async (downline) => {
      const wallet = await getWalletForMitraSession(downline.user_id, downline.roles);
      const primaryRole = downline.roles[0];
      return {
        relationship_id: downline.relationship_id,
        full_name: downline.full_name,
        email: downline.email,
        status: downline.status,
        joined_at: downline.joined_at,
        roleLabel: primaryRole ? (ROLE_LABEL[primaryRole] ?? primaryRole) : "-",
        maskedBalance: maskBalance(wallet?.available_balance ?? "0"),
      };
    }),
  );

  return { referralCode, downlines: withBalance };
}

export async function setReferralCodeStatus(id: string, isActive: boolean, actorUserId: string) {
  const code = await setReferralCodeActive(id, isActive);
  if (!code) {
    throw new Error("Kode referral tidak ditemukan");
  }

  await recordAuditLog({
    actor_user_id: actorUserId,
    action: isActive ? "REFERRAL_CODE_ACTIVATED" : "REFERRAL_CODE_DEACTIVATED",
    entity: "referral_codes",
    entity_id: code.id,
  });

  return code;
}

// USER vs MITRA — the tier the Commission Engine looks up on this code's
// owner to decide their direct referral reward rate (commission.service.ts's
// awardCommissionForTransaction). Independent of the owner's user_roles.
export async function setReferralCodeHolderStatus(
  id: string,
  holderStatus: ReferralCodeHolderStatus,
  actorUserId: string,
) {
  const code = await updateReferralCodeHolderStatusRow(id, holderStatus);
  if (!code) {
    throw new Error("Kode referral tidak ditemukan");
  }

  await recordAuditLog({
    actor_user_id: actorUserId,
    action: "REFERRAL_CODE_HOLDER_STATUS_CHANGED",
    entity: "referral_codes",
    entity_id: code.id,
    new_value: { holder_status: holderStatus },
  });

  return code;
}

// Blocking a relationship stops the Commission Engine from awarding on it
// (awardCommissionForTransaction only honors status='ACTIVE') — the
// standard fraud/abuse lever without deleting history.
export async function setReferralRelationshipStatus(
  id: string,
  status: ReferralRelationshipStatus,
  actorUserId: string,
) {
  const relationship = await updateReferralRelationshipStatusRow(id, status);
  if (!relationship) {
    throw new Error("Relasi referral tidak ditemukan");
  }

  await recordAuditLog({
    actor_user_id: actorUserId,
    action: status === "BLOCKED" ? "REFERRAL_RELATIONSHIP_BLOCKED" : "REFERRAL_RELATIONSHIP_UNBLOCKED",
    entity: "referral_relationships",
    entity_id: relationship.id,
  });

  return relationship;
}
