import { createHash } from "crypto";

export interface ParsedUserAgent {
  platform: string;
  browser: string;
  deviceName: string;
}

// The Flutter app identifies itself with this exact User-Agent (see
// digides_mitra's core/network/api_client.dart) instead of whatever Dio's
// own default would be ("Dart/x.y (dart:io)") — recognized here first, so
// a mitra logging in from the native app sees "Aplikasi DigiDes Mitra
// (Android)" in Akun > Perangkat instead of "Browser tidak dikenal di
// Tidak diketahui".
const MITRA_APP_UA = /^DigidesMitraApp\/([\d.]+) \(([^)]+)\)$/;

// Regex-only parsing (no dependency added) — good enough for the display
// fields the Security module needs (platform/browser columns), not meant
// to be a precise UA-sniffing library.
export function parseUserAgent(userAgent: string | null | undefined): ParsedUserAgent {
  const ua = userAgent ?? "";

  const appMatch = ua.match(MITRA_APP_UA);
  if (appMatch) {
    const platform = appMatch[2];
    return { platform, browser: "Aplikasi DigiDes Mitra", deviceName: `Aplikasi DigiDes Mitra (${platform})` };
  }

  let platform = "Tidak diketahui";
  if (/windows/i.test(ua)) platform = "Windows";
  else if (/iphone|ipad|ipod/i.test(ua)) platform = "iOS";
  else if (/android/i.test(ua)) platform = "Android";
  else if (/mac os x|macintosh/i.test(ua)) platform = "macOS";
  else if (/linux/i.test(ua)) platform = "Linux";

  let browser = "Browser tidak dikenal";
  if (/edg\//i.test(ua)) browser = "Edge";
  else if (/opr\/|opera/i.test(ua)) browser = "Opera";
  else if (/chrome\//i.test(ua)) browser = "Chrome";
  else if (/firefox\//i.test(ua)) browser = "Firefox";
  else if (/safari\//i.test(ua)) browser = "Safari";

  return { platform, browser, deviceName: `${browser} di ${platform}` };
}

// Two different physical machines sharing an identical UA string collapse
// into one device row — an accepted limitation with no client-side
// device-id cookie in place yet (see migration 021_security.sql).
export function fingerprintDevice(userId: string, userAgent: string | null | undefined): string {
  return createHash("sha256").update(`${userId}|${userAgent ?? ""}`).digest("hex");
}
