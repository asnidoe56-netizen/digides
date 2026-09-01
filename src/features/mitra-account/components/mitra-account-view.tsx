import Link from "next/link";
import { Briefcase, ChevronRight, KeyRound, Lock, ShieldCheck, Smartphone, User } from "lucide-react";
import { LogoutButton } from "@/features/auth/components/logout-button";

export interface MitraAccountViewProps {
  fullName: string;
  roleLabel: string;
  profilHref: string;
  perangkatHref: string;
  gantiPasswordHref: string;
  gantiPinHref: string;
  keamananHref: string;
}

export function MitraAccountView({
  fullName,
  roleLabel,
  profilHref,
  perangkatHref,
  gantiPasswordHref,
  gantiPinHref,
  keamananHref,
}: MitraAccountViewProps) {
  return (
    <div className="flex flex-col gap-4 pb-6">
      <div className="relative overflow-hidden rounded-b-3xl bg-gradient-to-br from-red-500 to-red-700 px-4 pt-4 pb-6 text-white sm:rounded-3xl">
        <span className="absolute top-4 right-4 flex size-11 items-center justify-center rounded-full bg-white text-red-600">
          <Briefcase className="size-5" />
        </span>

        <p className="text-xs text-white/80">Akun</p>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <p className="font-semibold">{fullName}</p>
          <span className="rounded-full bg-white/20 px-2 py-0.5 text-xs font-medium">{roleLabel}</span>
        </div>
        <div className="mt-2 flex items-center gap-1.5 text-xs text-white/90">
          <ShieldCheck className="size-3.5 shrink-0" />
          Akun aman &amp; terverifikasi
        </div>
      </div>

      <div className="flex flex-col gap-3 px-4">
        <Link
          href={profilHref}
          className="flex w-full items-center gap-3 rounded-2xl bg-background px-4 py-3 text-left text-sm font-medium shadow-sm"
        >
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-600">
            <User className="size-4" />
          </span>
          <span className="flex-1">Profil</span>
          <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
        </Link>

        <Link
          href={perangkatHref}
          className="flex w-full items-center gap-3 rounded-2xl bg-background px-4 py-3 text-left text-sm font-medium shadow-sm"
        >
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-600">
            <Smartphone className="size-4" />
          </span>
          <span className="flex-1">Perangkat</span>
          <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
        </Link>

        <Link
          href={gantiPasswordHref}
          className="flex w-full items-center gap-3 rounded-2xl bg-background px-4 py-3 text-left text-sm font-medium shadow-sm"
        >
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-600">
            <Lock className="size-4" />
          </span>
          <span className="flex-1">Ganti Password</span>
          <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
        </Link>

        <Link
          href={gantiPinHref}
          className="flex w-full items-center gap-3 rounded-2xl bg-background px-4 py-3 text-left text-sm font-medium shadow-sm"
        >
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-600">
            <KeyRound className="size-4" />
          </span>
          <span className="flex-1">Ganti PIN</span>
          <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
        </Link>

        <Link
          href={keamananHref}
          className="flex w-full items-center gap-3 rounded-2xl bg-background px-4 py-3 text-left text-sm font-medium shadow-sm"
        >
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-600">
            <ShieldCheck className="size-4" />
          </span>
          <span className="flex-1">Keamanan</span>
          <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
        </Link>

        <LogoutButton className="flex w-full items-center gap-3 rounded-2xl bg-red-50 px-4 py-3 text-left text-sm font-medium text-destructive shadow-sm hover:bg-red-100" />

        <div className="relative overflow-hidden rounded-2xl bg-background px-4 py-3 shadow-sm">
          <Lock className="absolute -right-2 top-1/2 size-16 -translate-y-1/2 text-red-50" />
          <div className="relative flex items-start gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-600">
              <ShieldCheck className="size-4" />
            </span>
            <div>
              <p className="text-sm font-medium">Jaga keamanan akun Anda</p>
              <p className="text-xs text-muted-foreground">Jangan bagikan informasi akun kepada siapapun.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
