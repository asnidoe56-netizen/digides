import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth/session";
import { verifyTransactionPin } from "@/services/auth.service";

const verifyPinSchema = z.object({
  pin: z.string().regex(/^[0-9]{6}$/, "PIN harus 6 digit"),
});

// A pure check, no side effects beyond what verifyTransactionPin already
// does on its own (attempt counting / lockout via security_policies) —
// never changes the PIN, never touches a credential. First caller is the
// Flutter app's Akun > Keamanan "Daftarkan Perangkat Ini", which requires
// the mitra to prove PIN ownership before a biometric credential is ever
// created, but this route has no reason to stay biometric-specific: any
// future "confirm this is really the account owner" flow can reuse it
// as-is.
export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Tidak diizinkan" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = verifyPinSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Data tidak valid", issues: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  try {
    await verifyTransactionPin(session.userId, parsed.data.pin);
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "PIN salah.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
