import { NotificationBell } from "@/features/notification";

export interface MitraHeaderProps {
  fullName: string;
  roleLabel: string;
}

// The hamburger menu that used to live here (welcome-name + role + Keluar
// in a slide-out sheet) moved to the "Akun" bottom-nav tab instead — see
// MitraAccountView.
export function MitraHeader({ fullName, roleLabel }: MitraHeaderProps) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="min-w-0 flex-1 text-white">
        <p className="text-xs text-white/80">Selamat datang,</p>
        <p className="truncate text-sm font-semibold">
          {fullName} <span className="font-normal text-white/80">({roleLabel})</span>
        </p>
      </div>

      {/* NotificationBell has no theming props, so its toggle button is
          re-colored for this red header via a precise attribute selector
          (its aria-label) — narrow enough that it can't leak into the
          dropdown panel's own buttons, which must keep their normal
          light-background styling. */}
      <div className='[&_button[aria-label="Notifikasi"]]:text-white [&_button[aria-label="Notifikasi"]:hover]:bg-white/10'>
        <NotificationBell />
      </div>
    </div>
  );
}
