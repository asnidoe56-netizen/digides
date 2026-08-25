"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

export function ReferralCodeCard({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API can be unavailable (older browsers, insecure
      // context) — the code is already visible on screen either way, so
      // this is a silent no-op rather than an error.
    }
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl bg-white/10 p-4 text-white backdrop-blur-sm">
      <p className="text-xs text-white/80">ID Referensi Anda</p>
      <div className="flex items-center justify-between gap-3">
        <span className="font-mono text-2xl font-bold tracking-widest">{code}</span>
        <button
          type="button"
          onClick={handleCopy}
          aria-label="Salin kode"
          className="flex size-9 shrink-0 items-center justify-center rounded-full bg-white text-red-600"
        >
          {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
        </button>
      </div>
      <p className="text-xs text-white/80">
        {copied ? "Kode berhasil disalin!" : "Bagikan kode ini agar orang lain terdaftar sebagai downline Anda."}
      </p>
    </div>
  );
}
