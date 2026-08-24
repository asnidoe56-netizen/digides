import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { testDigiflazzConnection } from "@/services/digiflazz.service";

// Same access rule as /api/digiflazz/settings — this reaches Digiflazz
// using the real, saved API key, so only SUPER_ADMIN may trigger it.
export async function POST() {
  const session = await getSession();
  if (!session || !session.roles.includes("SUPER_ADMIN")) {
    return NextResponse.json({ error: "Tidak diizinkan" }, { status: 403 });
  }

  // Always 200 here — "Digiflazz says the credentials don't work" is a
  // normal outcome for the admin to see, not a server error. A real error
  // (bad auth, bad request) still uses a non-2xx status above.
  const result = await testDigiflazzConnection();
  return NextResponse.json(result);
}
