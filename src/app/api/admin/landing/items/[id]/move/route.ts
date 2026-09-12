import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth/session";
import { LandingError, geserButir } from "@/services/landing.service";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || !session.roles.includes("SUPER_ADMIN")) {
    return NextResponse.json({ error: "Tidak diizinkan" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const arah = body?.arah === "turun" ? "turun" : "naik";

  try {
    await geserButir(id, arah);
    revalidatePath("/");
    return NextResponse.json({ ok: true });
  } catch (caught) {
    if (caught instanceof LandingError) {
      return NextResponse.json({ error: caught.message }, { status: 400 });
    }
    console.error("Gagal menggeser butir", caught);
    return NextResponse.json({ error: "Gagal menggeser." }, { status: 500 });
  }
}
