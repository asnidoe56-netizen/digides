import { createHmac, timingSafeEqual } from "crypto";

// Digiflazz signs webhook deliveries with an `X-Hub-Signature` header
// shaped "sha1=<hex hmac>", computed over the exact raw request body bytes
// using the Secret configured on their Atur Koneksi → Webhook page (see
// https://developer.digiflazz.com/api/buyer/webhook/). The signature must
// be computed from the raw body — re-serializing a parsed JSON object can
// produce different bytes (key order, whitespace) and silently fail to
// match even for a genuine request.
export function verifyDigiflazzWebhookSignature(
  rawBody: string,
  signatureHeader: string | null,
  secret: string,
): boolean {
  if (!signatureHeader) return false;

  const expected = `sha1=${createHmac("sha1", secret).update(rawBody).digest("hex")}`;
  const provided = Buffer.from(signatureHeader);
  const expectedBuffer = Buffer.from(expected);
  if (provided.length !== expectedBuffer.length) return false;
  return timingSafeEqual(provided, expectedBuffer);
}
