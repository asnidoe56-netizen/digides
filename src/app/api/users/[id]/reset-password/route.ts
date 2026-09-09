import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { resetUserPasswordAsAdmin } from "@/services/account-recovery.service";

// docs/security/PEMULIHAN_AKSES_AKUN.md §4 Prioritas 1 — issue a
// temporary password to a mitra who has forgotten theirs.
//
// The response carries the temporary password in plaintext, and that is
// the ONLY moment it exists in readable form anywhere: it is never
// stored, never logged, and cannot be fetched again. If the admin loses
// it before passing it on, they run the reset a second time and get a
// different one. That is the intended cost of not keeping it around.
//
// There is deliberately no GET here for the same reason.
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || !session.roles.includes("SUPER_ADMIN")) {
    return NextResponse.json({ error: "Tidak diizinkan" }, { status: 403 });
  }

  const { id } = await params;

  try {
    const result = await resetUserPasswordAsAdmin(id, session.userId);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Gagal mengatur ulang password." },
      { status: 400 },
    );
  }
}
