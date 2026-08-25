"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FileBarChart2, Home, QrCode, User, Users } from "lucide-react";
import { cn } from "@/lib/utils";

export interface MitraBottomNavProps {
  homeHref: string;
  mitraHref: string;
}

// "Beranda" and "Mitra" link somewhere real; Laporan/Akun and the QRIS
// scan action are the next menus to build for this section (BUMDes/
// Konter), so they're shown disabled rather than linking to a route with
// no page behind it yet.
export function MitraBottomNav({ homeHref, mitraHref }: MitraBottomNavProps) {
  const pathname = usePathname();
  const isHome = pathname === homeHref;
  const isMitra = pathname === mitraHref;

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 mx-auto flex h-16 max-w-lg items-stretch border-t bg-background">
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

      <button
        type="button"
        disabled
        title="Segera hadir"
        className="flex flex-1 flex-col items-center justify-center gap-1 text-xs text-muted-foreground/50"
      >
        <FileBarChart2 className="size-5" />
        Laporan
      </button>

      <button
        type="button"
        disabled
        title="Segera hadir"
        className="flex flex-1 flex-col items-center justify-center gap-1 text-xs text-muted-foreground/50"
      >
        <User className="size-5" />
        Akun
      </button>
    </nav>
  );
}
