"use client";

import { useState } from "react";
import { Check, Copy, Globe } from "lucide-react";

// Same copy-button UX as ReferralCodeCard (mitra-referral) — the IP itself
// is passed in already resolved server-side (see network-info.service.ts's
// getServerPublicIp, called from the Pengaturan page), since only a server
// request actually leaves through this server's own outbound IP; a
// client-side lookup here would report the admin's own browser's IP
// instead.
export function ServerIpCard({ ip }: { ip: string | null }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    if (!ip) return;
    try {
      await navigator.clipboard.writeText(ip);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API can be unavailable — the IP is already visible on
      // screen either way, so this is a silent no-op rather than an error.
    }
  }

  return (
    <div className="flex max-w-lg items-center gap-3 rounded-lg border bg-muted/40 p-4">
      <Globe className="size-5 shrink-0 text-muted-foreground" />
      <div className="min-w-0 flex-1">
        <p className="text-xs text-muted-foreground">IP Publik Server Ini</p>
        {ip ? (
          <p className="font-mono text-sm font-semibold">{ip}</p>
        ) : (
          <p className="text-sm text-muted-foreground">Gagal memuat IP saat ini.</p>
        )}
        <p className="mt-1 text-xs text-muted-foreground">
          Tambahkan IP ini ke daftar putih (whitelist) di laman Pengaturan Koneksi API Digiflazz.
        </p>
      </div>
      <button
        type="button"
        onClick={handleCopy}
        disabled={!ip}
        aria-label="Salin IP"
        className="flex size-9 shrink-0 items-center justify-center rounded-full border text-muted-foreground hover:bg-muted disabled:opacity-40"
      >
        {copied ? <Check className="size-4 text-emerald-600" /> : <Copy className="size-4" />}
      </button>
    </div>
  );
}
