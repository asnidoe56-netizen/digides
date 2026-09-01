// WebAuthn's Relying Party ID must be exactly the site's domain (no
// scheme, no port) — derived from APP_URL instead of hardcoded so dev
// ("localhost", one of the spec's explicit valid-without-TLS exceptions)
// and production (the real domain, which WebAuthn requires HTTPS for)
// both work without a code change. The origin, by contrast, must match
// the browser's full origin exactly (scheme + host + port), so APP_URL is
// used as-is for that one.
export interface WebauthnConfig {
  rpID: string;
  rpName: string;
  origin: string;
}

export function getWebauthnConfig(): WebauthnConfig {
  const appUrl = process.env.APP_URL;
  if (!appUrl) {
    throw new Error("APP_URL is not set");
  }
  const url = new URL(appUrl);
  return {
    rpID: url.hostname,
    rpName: "DigiDes Payment",
    origin: url.origin,
  };
}
