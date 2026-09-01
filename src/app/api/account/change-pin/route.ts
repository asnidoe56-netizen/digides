import { NextResponse } from "next/server";
import { changePinServerSchema } from "@/features/mitra-account/schemas/change-pin.schema";
import { hashPin } from "@/lib/auth/pin";
import { getSession } from "@/lib/auth/session";
import { recordAuditLog } from "@/repositories/audit.repository";
import { changeTransactionPin } from "@/repositories/user.repository";
import { verifyTransactionPin } from "@/services/auth.service";

// Akun > Ganti PIN — reuses verifyTransactionPin (the exact same check/
// attempt-counting/lockout engine executeTransaction confirms every real
// purchase's PIN with, see auth.service.ts) instead of a parallel
// unthrottled check, so brute-forcing this form is rate-limited the same
// way brute-forcing a purchase's PIN already is. A successful change resets
// failed_attempts/status/locked_until as a side effect of
// changeTransactionPin — the mitra just proved themselves with the old PIN,
// so they start clean on the new one.
export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Tidak diizinkan" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = changePinServerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Data tidak valid", issues: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  try {
    await verifyTransactionPin(session.userId, parsed.data.currentPin);
  } catch (error) {
    const message = error instanceof Error ? error.message : "PIN saat ini salah.";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const newHash = await hashPin(parsed.data.newPin);
  await changeTransactionPin(session.userId, newHash);

  // No old/new value — a PIN hash has no business being anywhere near an
  // audit log, even hashed.
  await recordAuditLog({
    actor_user_id: session.userId,
    action: "USER_PIN_CHANGED",
    entity: "users",
    entity_id: session.userId,
  });

  return NextResponse.json({ success: true });
}
