import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { readNotification } from "@/services/notification.service";
import type { RoleCode } from "@/types/user";

export async function PATCH(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Tidak diizinkan" }, { status: 403 });
  }

  const { id } = await params;

  try {
    const notification = await readNotification(id, session.roles[0] as RoleCode);
    return NextResponse.json({ notification });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Gagal menandai notifikasi." },
      { status: 400 },
    );
  }
}
