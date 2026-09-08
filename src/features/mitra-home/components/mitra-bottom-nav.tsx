"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FileBarChart2, Home, QrCode, User, Users } from "lucide-react";
import { cn } from "@/lib/utils";

export interface MitraBottomNavProps {
  homeHref: string;
  mitraHref: string;
  laporanHref: string;
  akunHref: string;
  /** Digides Toko's section root — the centre action. Omitted keeps the
   *  button disabled, for any section that doesn't have Toko yet. */
  tokoHref?: string;
}

// Every tab links somewhere real. The raised centre button is Digides
// Toko (the store cashier) — the slot was always meant for the QR-based
// flow, and Toko is what finally fills it. print:hidden — this chrome has
// no place in an exported Laporan PDF (see DownloadPdfButton).
export function MitraBottomNav({ homeHref, mitraHref, laporanHref, akunHref, tokoHref }: MitraBottomNavProps) {
  const pathname = usePathname();
  const isHome = pathname === homeHref;
  const isMitra = pathname === mitraHref;
  const isLaporan = pathname === laporanHref;
  const isAkun = pathname === akunHref;
  const isToko = Boolean(tokoHref && pathname.startsWith(tokoHref));

  return (
    <nav className="print:hidden fixed inset-x-0 bottom-0 z-40 mx-auto flex h-16 max-w-lg items-stretch border-t border-border bg-background">
      <Link
        href={homeHref}
        className={cn(
          "flex flex-1 flex-col items-center justify-center gap-1 text-xs font-medium",
          isHome ? "text-red-600" : "text-muted-foreground",
        )}
      >
        <Home className="size-5" />
        Beranda
      </Link>

      <Link
        href={mitraHref}
        className={cn(
          "flex flex-1 flex-col items-center justify-center gap-1 text-xs font-medium",
          isMitra ? "text-red-600" : "text-muted-foreground",
        )}
      >
        <Users className="size-5" />
        Mitra
      </Link>

      <div className="flex flex-1 items-center justify-center">
        {tokoHref ? (
          <Link
            href={tokoHref}
            aria-label="Digides Toko"
            className={cn(
              "-mt-6 flex size-14 items-center justify-center rounded-full text-white shadow-lg transition-colors",
              isToko ? "bg-red-700 ring-4 ring-red-600/20" : "bg-red-600 hover:bg-red-700",
            )}
          >
            <QrCode className="size-6" />
          </Link>
        ) : (
          <button
            type="button"
            disabled
            title="Segera hadir"
            className="-mt-6 flex size-14 items-center justify-center rounded-full bg-red-600/50 text-white shadow-lg"
          >
            <QrCode className="size-6" />
          </button>
        )}
      </div>

      <Link
        href={laporanHref}
        className={cn(
          "flex flex-1 flex-col items-center justify-center gap-1 text-xs font-medium",
          isLaporan ? "text-red-600" : "text-muted-foreground",
        )}
      >
        <FileBarChart2 className="size-5" />
        Laporan
      </Link>

      <Link
        href={akunHref}
        className={cn(
          "flex flex-1 flex-col items-center justify-center gap-1 text-xs font-medium",
          isAkun ? "text-red-600" : "text-muted-foreground",
        )}
      >
        <User className="size-5" />
        Akun
      </Link>
    </nav>
  );
}
