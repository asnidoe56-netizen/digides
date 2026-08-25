import { recordAuditLog } from "@/repositories/audit.repository";
import {
  createReferralCode,
  findReferralCodeByUserId,
  insertReferralCodeWithRetry,
  listReferralCodes,
  listReferralRelationships,
  setReferralCodeActive,
  setReferralRelationshipStatus as updateReferralRelationshipStatusRow,
} from "@/repositories/referral.repository";
import { findUserById } from "@/repositories/user.repository";
import type { ReferralRelationshipStatus } from "@/types/referral";

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

// Blocking a relationship stops the Commission Engine's referrer-chain
// walk from crossing it (findReferrerChain only follows status='ACTIVE')
// — the standard fraud/abuse lever without deleting history.
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
