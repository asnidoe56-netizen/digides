import { NextResponse } from "next/server";
import { processMidtransNotification } from "@/services/wallet-topup.service";

// Called by Midtrans's servers, not a logged-in browser — there's no
// session to check here. Trust is established entirely by verifying the
// notification's signature_key inside processMidtransNotification
// (issue M18 §33: never trust amount/status from an external caller
// without verifying it came from who it claims to).
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);

  if (!body?.order_id || !body?.signature_key) {
    return NextResponse.json({ error: "Payload tidak lengkap" }, { status: 400 });
  }

  try {
    await processMidtransNotification(body);
    return NextResponse.json({ status: "ok" }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gagal memproses notifikasi.";
    if (message.includes("Signature")) {
      return NextResponse.json({ error: message }, { status: 401 });
    }
    if (message.includes("tidak ditemukan")) {
      return NextResponse.json({ error: message }, { status: 404 });
    }
    // Anything else is treated as transient — Midtrans retries a non-2xx
    // response, which is the right behavior for e.g. a DB hiccup.
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
