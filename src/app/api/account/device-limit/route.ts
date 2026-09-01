import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth/session";
import { getMyDeviceLimit, setMyDeviceLimit } from "@/services/security.service";

// Akun > Keamanan's "Batasi Perangkat" — a mitra's own, optional stricter
// cap on how many devices can be logged into their account at once,
// enforced at login time (see security.service.ts's authorizeDeviceForLogin).
export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Tidak diizinkan" }, { status: 403 });
  }

  const limit = await getMyDeviceLimit(session.userId);
  return NextResponse.json(limit);
}

const updateSchema = z.object({
  maxActiveDevices: z.number().int().min(1).max(5),
});

export async function PATCH(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Tidak diizinkan" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Data tidak valid", issues: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  await setMyDeviceLimit(session.userId, parsed.data.maxActiveDevices, session.userId);
  const limit = await getMyDeviceLimit(session.userId);
  return NextResponse.json(limit);
}
