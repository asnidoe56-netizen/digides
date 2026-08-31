// Server -> Digiflazz calls (catalog sync, live-price checks, purchases,
// name verification) all leave this server through the same public IP an
// external "what's my IP" lookup sees — the one thing Digiflazz's own
// whitelist actually needs, and the one thing nobody in this app can look
// up from inside a browser (a client-side call would report the admin's
// own IP, not the server's). A short timeout + graceful null on failure:
// this is a convenience readout on the Pengaturan page, not something any
// other feature depends on working.
export async function getServerPublicIp(): Promise<string | null> {
  try {
    const response = await fetch("https://api.ipify.org?format=json", {
      signal: AbortSignal.timeout(5000),
      cache: "no-store",
    });
    if (!response.ok) return null;
    const body = (await response.json()) as { ip?: string };
    return body.ip ?? null;
  } catch {
    return null;
  }
}
