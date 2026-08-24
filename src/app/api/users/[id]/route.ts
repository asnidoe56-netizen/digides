import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth/session";
import { findUserById, updateUserStatus } from "@/repositories/user.repository";
import { recordAuditLog } from "@/repositories/audit.repository";

const updateStatusSchema = z.object({
  status: z.enum(["ACTIVE", "SUSPENDED", "DELETED"]),
});

// "Delete" here is always the soft delete users.status already supports
// (DELETED) — a hard DELETE FROM users would violate foreign keys from
// audit_logs, wallet_accounts, bumdes, konters, etc. the moment a user has
// done anything at all, and would destroy audit trail attribution. This
// endpoint only ever changes the status column.
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || !session.roles.includes("SUPER_ADMIN")) {
    return NextResponse.json({ error: "Tidak diizinkan" }, { status: 403 });
  }

  const { id } = await params;

  if (id === session.userId) {
    return NextResponse.json(
      { error: "Anda tidak dapat mengubah status akun Anda sendiri." },
      { status: 400 },
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = updateStatusSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Status tidak valid" }, { status: 400 });
  }

  const existing = await findUserById(id);
  if (!existing) {
    return NextResponse.json({ error: "Pengguna tidak ditemukan" }, { status: 404 });
  }

  const updated = await updateUserStatus(id, parsed.data.status);

  await recordAuditLog({
    actor_user_id: session.userId,
    action: "USER_STATUS_CHANGED",
    entity: "users",
    entity_id: id,
    old_value: { status: existing.status },
    new_value: { status: parsed.data.status },
  });

  return NextResponse.json({ id: updated?.id, status: updated?.status });
}
