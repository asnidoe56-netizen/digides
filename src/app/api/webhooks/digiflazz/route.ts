import { NextResponse } from "next/server";
import { processDigiflazzWebhookEvent } from "@/services/transaction.service";

// Called by Digiflazz's servers, not a logged-in browser — there's no
// session to check here. Trust is established entirely by verifying the
// X-Hub-Signature header inside processDigiflazzWebhookEvent, computed over
// the raw body — the same reason request.text() is read here instead of
// request.json() (a re-serialized object can produce different bytes and
// silently fail to match even a genuine request).
export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-hub-signature");

  try {
    await processDigiflazzWebhookEvent(rawBody, signature);
    return NextResponse.json({ status: "ok" }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gagal memproses webhook.";
    // Temporary diagnostic: a real Digiflazz delivery has been rejected in
    // production with a status this handler's own known error strings
    // don't account for. Logs only the raw body/signature/error — nothing
    // secret — to find out which branch actually threw. Remove once the
    // cause is confirmed.
    console.error("[digiflazz-webhook] rejected:", { message, signature, rawBody });
    if (message.includes("Signature") || message.includes("belum dikonfigurasi")) {
      return NextResponse.json({ error: message }, { status: 401 });
    }
    if (message.includes("tidak ditemukan") || message.includes("tidak lengkap")) {
      return NextResponse.json({ error: message }, { status: 404 });
    }
    // Anything else is treated as transient — Digiflazz retries a non-2xx
    // response, which is the right behavior for e.g. a DB hiccup.
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
