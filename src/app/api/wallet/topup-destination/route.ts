import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession, requireRole } from "@/lib/auth/session";
import { getMyTopupDestination, updateManualTopupDestinationAndAudit } from "@/services/manual-topup-destination.service";

// Any authenticated role can read this — it's what the Mitra app's
// "Detail Pembayaran" screen fetches to show which DANA/bank account to
// transfer to, same "any logged-in role" rule as /api/settings/support.
export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Tidak diizinkan" }, { status: 403 });
  }

  const destination = await getMyTopupDestination();
  return NextResponse.json({ destination });
}

const destinationSchema = z.object({
  danaNumber: z.string().trim().min(1, "Wajib diisi"),
  danaAccountName: z.string().trim().min(1, "Wajib diisi"),
  bankName: z.string().trim().min(1, "Wajib diisi"),
  bankAccountNumber: z.string().trim().min(1, "Wajib diisi"),
  bankAccountName: z.string().trim().min(1, "Wajib diisi"),
});

export async function PATCH(request: Request) {
  const session = await requireRole("SUPER_ADMIN");
  if (!session) {
    return NextResponse.json({ error: "Tidak diizinkan" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = destinationSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Data tidak valid", issues: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const destination = await updateManualTopupDestinationAndAudit(
    {
      dana_number: parsed.data.danaNumber,
      dana_account_name: parsed.data.danaAccountName,
      bank_name: parsed.data.bankName,
      bank_account_number: parsed.data.bankAccountNumber,
      bank_account_name: parsed.data.bankAccountName,
    },
    session.userId,
  );
  return NextResponse.json({ destination });
}
