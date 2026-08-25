import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/session";
import { testMidtransConnection } from "@/services/midtrans.service";

export async function POST() {
  const session = await requireRole("SUPER_ADMIN");
  if (!session) {
    return NextResponse.json({ error: "Tidak diizinkan" }, { status: 403 });
  }

  // Always 200 here — "Midtrans says the credentials don't work" is a
  // normal outcome for the admin to see, not a server error.
  const result = await testMidtransConnection();
  return NextResponse.json(result);
}
