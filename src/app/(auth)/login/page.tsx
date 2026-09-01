import Link from "next/link";
import { ShieldCheck, Zap } from "lucide-react";
import { LoginForm } from "@/features/auth";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ registered?: string }>;
}) {
  const { registered } = await searchParams;

  return (
    <main className="flex min-h-screen flex-col bg-red-700 sm:items-center sm:justify-center sm:bg-muted sm:py-10">
      <div className="flex w-full flex-1 flex-col sm:max-w-sm sm:flex-none sm:overflow-hidden sm:rounded-3xl sm:shadow-xl">
        {/* Hero — decorative only, matches the app's established red-gradient
            "mitra" branding (WalletSummaryCard/PromoBanner) rather than a
            literal illustrated asset we don't have. */}
        <div className="relative flex flex-col items-center gap-3 overflow-hidden bg-linear-to-br from-red-500 via-red-600 to-red-800 px-6 pt-12 pb-16 text-center text-white">
          <VillageSilhouette />

          <div className="relative z-10 flex size-16 items-center justify-center rounded-2xl bg-white shadow-lg">
            <Zap className="size-8 fill-red-600 text-red-600" />
          </div>
          <div className="relative z-10">
            <h1 className="text-2xl font-bold">DigiDes Paymen</h1>
            <p className="mt-1 text-sm text-white/90">Solusi Transaksi Digital Untuk Desa Indonesia</p>
          </div>
        </div>

        {/* Card — pulled up over the hero on mobile like a bottom sheet. */}
        <div className="relative z-10 -mt-8 flex flex-1 flex-col gap-5 rounded-t-3xl bg-background px-6 pt-6 pb-8 sm:mt-0 sm:rounded-none sm:pb-6">
          <div>
            <h2 className="text-lg font-semibold">Selamat Datang Kembali!</h2>
            <p className="text-sm text-muted-foreground">Masuk untuk melanjutkan transaksi</p>
          </div>

          {registered ? (
            <p className="rounded-md bg-status-success px-3 py-2 text-center text-sm text-status-success-foreground">
              Pendaftaran berhasil. Silakan masuk.
            </p>
          ) : null}

          <LoginForm />

          <p className="text-center text-sm text-muted-foreground">
            Belum punya akun?{" "}
            <Link href="/register" className="font-semibold text-red-600 underline-offset-4 hover:underline">
              Daftar Sekarang
            </Link>
          </p>

          <div className="flex items-start gap-3 rounded-xl bg-muted p-3">
            <ShieldCheck className="mt-0.5 size-5 shrink-0 text-red-600" />
            <div>
              <p className="text-sm font-medium">Aman, Cepat, Terpercaya</p>
              <p className="text-xs text-muted-foreground">
                Transaksi dijamin aman dengan sistem keamanan berlapis
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

// A simple rolling-hills-and-rooftops silhouette plus small flags, standing
// in for the reference mockup's illustrated village artwork (no such asset
// exists in this project). Purely decorative, aria-hidden.
function VillageSilhouette() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 400 140"
      preserveAspectRatio="none"
      className="pointer-events-none absolute inset-x-0 bottom-0 h-24 w-full text-white/10"
    >
      <path
        d="M0 90 Q60 40 120 80 T240 70 T400 90 V140 H0 Z"
        fill="currentColor"
      />
      <path
        d="M0 110 Q80 70 160 105 T400 108 V140 H0 Z"
        className="text-white/15"
        fill="currentColor"
      />
      <g className="text-white/25" fill="currentColor">
        <polygon points="60,115 90,115 75,95" />
        <rect x="65" y="115" width="20" height="18" />
        <polygon points="150,120 185,120 167.5,98" />
        <rect x="155" y="120" width="25" height="20" />
        <polygon points="280,118 310,118 295,98" />
        <rect x="284" y="118" width="22" height="19" />
      </g>
      <g stroke="#ffffff" strokeWidth="1.5" opacity="0.5">
        <line x1="30" y1="60" x2="30" y2="100" />
        <line x1="340" y1="55" x2="340" y2="100" />
      </g>
      <g fill="#ffffff" opacity="0.6">
        <polygon points="30,60 42,64 30,68" />
        <polygon points="340,55 352,59 340,63" />
      </g>
    </svg>
  );
}
