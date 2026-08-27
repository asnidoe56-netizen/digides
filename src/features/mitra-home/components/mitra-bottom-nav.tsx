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
}

// "Beranda", "Mitra", "Laporan", and "Akun" all link somewhere real; the
// QRIS scan action is the next thing to build for this section (BUMDes/
// Konter), so it's shown disabled rather than linking to a route with no
// page behind it yet. print:hidden — this chrome has no place in an
// exported Laporan PDF (see DownloadPdfButton).
export function MitraBottomNav({ homeHref, mitraHref, laporanHref, akunHref }: MitraBottomNavProps) {
  const pathname = usePathname();
  const isHome = pathname === homeHref;
  const isMitra = pathname === mitraHref;
  const isLaporan = pathname === laporanHref;
  const isAkun = pathname === akunHref;

  return (
    <nav className="print:hidden fixed inset-x-0 bottom-0 z-40 mx-auto flex h-16 max-w-lg items-stretch border-t bg-background">
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
        <button
          type="button"
          disabled
          title="Segera hadir"
          className="-mt-6 flex size-14 items-center justify-center rounded-full bg-red-600/50 text-white shadow-lg"
        >
          <QrCode className="size-6" />
        </button>
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
