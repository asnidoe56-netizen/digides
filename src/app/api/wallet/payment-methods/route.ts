import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession, requireRole } from "@/lib/auth/session";
import { createManualPaymentMethodAndAudit, getActiveManualPaymentMethods } from "@/services/manual-payment-method.service";

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

const createSchema = z.object({
  code: z.string().trim().min(1, "Wajib diisi"),
  displayName: z.string().trim().min(1, "Wajib diisi"),
  accountNumber: z.string().trim().min(1, "Wajib diisi"),
  accountName: z.string().trim().min(1, "Wajib diisi"),
});

// "Tambah Metode" — Super Admin only. Starts inactive; see
// manual-payment-method.service.ts's createManualPaymentMethodAndAudit.
export async function POST(request: Request) {
  const session = await requireRole("SUPER_ADMIN");
  if (!session) {
    return NextResponse.json({ error: "Tidak diizinkan" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Data tidak valid", issues: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  try {
    const method = await createManualPaymentMethodAndAudit(
      {
        code: parsed.data.code,
        display_name: parsed.data.displayName,
        account_number: parsed.data.accountNumber,
        account_name: parsed.data.accountName,
      },
      session.userId,
    );
    return NextResponse.json({ method }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Gagal menambahkan metode pembayaran." },
      { status: 400 },
    );
  }
}
