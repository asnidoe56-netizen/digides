import { ChevronRight, KeyRound, Lock, ShieldCheck, Smartphone, User } from "lucide-react";
import { LogoutButton } from "@/features/auth/components/logout-button";
import { cn } from "@/lib/utils";

export interface MitraAccountViewProps {
  fullName: string;
  roleLabel: string;
}

// Tahap 1: UI and navigation only, per the current request — Profil,
// Perangkat, Keamanan, Ganti PIN, and Ganti Password are placeholders
// (disabled, "Segera hadir") until their own screens/logic are built in a
// later pass. Only Keluar is wired to real behavior, reusing the existing
// LogoutButton as-is.
const PLACEHOLDER_MENU_ITEMS = [
  { label: "Profil", icon: User },
  { label: "Perangkat", icon: Smartphone },
  { label: "Keamanan", icon: ShieldCheck },
  { label: "Ganti PIN", icon: KeyRound },
  { label: "Ganti Password", icon: Lock },
];

export function MitraAccountView({ fullName, roleLabel }: MitraAccountViewProps) {
  return (
    <div className="flex flex-col gap-6 pb-6">
      <div className="flex flex-col gap-1 rounded-b-3xl bg-gradient-to-br from-red-500 to-red-700 px-4 pt-4 pb-6 text-white sm:rounded-3xl">
        <p className="text-xs text-white/80">Akun</p>
        <p className="font-semibold">
          {fullName} <span className="font-normal text-white/80">({roleLabel})</span>
        </p>
      </div>

      <div className="flex flex-col gap-3 px-4">
        <div className="overflow-hidden rounded-2xl border">
          {PLACEHOLDER_MENU_ITEMS.map(({ label, icon: Icon }, index) => (
            <button
              key={label}
              type="button"
              disabled
              title="Segera hadir"
              className={cn(
                "flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-medium text-muted-foreground/60",
                index > 0 && "border-t",
              )}
            >
              <Icon className="size-4 shrink-0" />
              <span className="flex-1">{label}</span>
              <ChevronRight className="size-4 shrink-0" />
            </button>
          ))}
        </div>

        <div className="overflow-hidden rounded-2xl border">
          <LogoutButton className="w-full justify-start rounded-none px-4 py-3 text-destructive hover:bg-destructive/10 hover:text-destructive" />
        </div>
      </div>
    </div>
  );
}
