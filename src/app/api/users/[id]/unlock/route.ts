import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { unlockUserAccount } from "@/services/account-recovery.service";

// docs/security/PEMULIHAN_AKSES_AKUN.md §4 Prioritas 2 — lift a
// brute-force lockout from the screen an admin actually opens when a
// mitra reports they cannot log in.
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || !session.roles.includes("SUPER_ADMIN")) {
    return NextResponse.json({ error: "Tidak diizinkan" }, { status: 403 });
  }

  const { id } = await params;

  try {
    await unlockUserAccount(id, session.userId);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Gagal membuka kunci akun." },
      { status: 400 },
    );
  }
}
