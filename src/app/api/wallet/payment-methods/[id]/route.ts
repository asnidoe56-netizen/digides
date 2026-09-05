import { NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/auth/session";
import { updateManualPaymentMethodAndAudit } from "@/services/manual-payment-method.service";

const updateSchema = z.object({
  displayName: z.string().trim().min(1, "Wajib diisi"),
  accountNumber: z.string().trim().min(1, "Wajib diisi"),
  accountName: z.string().trim().min(1, "Wajib diisi"),
});

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireRole("SUPER_ADMIN");
  if (!session) {
    return NextResponse.json({ error: "Tidak diizinkan" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Data tidak valid", issues: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  try {
    const method = await updateManualPaymentMethodAndAudit(
      id,
      {
        display_name: parsed.data.displayName,
        account_number: parsed.data.accountNumber,
        account_name: parsed.data.accountName,
      },
      session.userId,
    );
    return NextResponse.json({ method });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Gagal menyimpan metode pembayaran." },
      { status: 400 },
    );
  }
}
