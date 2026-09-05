import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getActiveManualPaymentMethods } from "@/services/manual-payment-method.service";

// Any authenticated role can read this — it's what the Mitra app's "Isi
// Saldo" screen fetches to render the payment-method list, same "any
// logged-in role" rule as /api/settings/support. Only ACTIVE methods, so a
// method Super Admin hasn't configured/enabled yet never reaches a Mitra.
export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Tidak diizinkan" }, { status: 403 });
  }

  const methods = await getActiveManualPaymentMethods();
  return NextResponse.json({ methods });
}
