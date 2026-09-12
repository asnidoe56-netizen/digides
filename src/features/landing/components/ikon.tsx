import {
  ArrowRight,
  BarChart3,
  Building2,
  CheckCircle2,
  Coins,
  Fingerprint,
  Handshake,
  Home,
  Link2,
  type LucideIcon,
  Receipt,
  Settings,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Store,
  Sun,
  Timer,
  TrendingDown,
  Users,
  Wallet,
  Zap,
} from "lucide-react";

/**
 * Ikon yang boleh dipakai isi halaman depan.
 *
 * Daftarnya sengaja TERTUTUP dan dipilih admin dari menu, bukan diketik
 * bebas. Nama ikon yang salah ketik akan menjadi lubang kosong di halaman
 * yang dibaca calon mitra, dan tidak ada yang memberi tahu — kesalahan yang
 * hanya ketahuan kalau kebetulan ada yang membuka halamannya.
 *
 * Kuncinya bahasa Inggris pendek karena itulah yang tersimpan di basis data;
 * labelnya yang berbahasa Indonesia dipakai halaman admin.
 */
export const IKON: Record<string, { komponen: LucideIcon; label: string }> = {
  users: { komponen: Users, label: "Warga / orang" },
  handshake: { komponen: Handshake, label: "Jabat tangan" },
  chart: { komponen: BarChart3, label: "Grafik naik" },
  "chart-turun": { komponen: TrendingDown, label: "Grafik turun" },
  coins: { komponen: Coins, label: "Uang" },
  wallet: { komponen: Wallet, label: "Dompet" },
  zap: { komponen: Zap, label: "Listrik" },
  smartphone: { komponen: Smartphone, label: "HP / pulsa" },
  receipt: { komponen: Receipt, label: "Tagihan" },
  store: { komponen: Store, label: "Toko" },
  home: { komponen: Home, label: "Rumah / desa" },
  building: { komponen: Building2, label: "Kantor / BUMDes" },
  shield: { komponen: ShieldCheck, label: "Keamanan" },
  fingerprint: { komponen: Fingerprint, label: "Sidik jari" },
  timer: { komponen: Timer, label: "Cepat" },
  settings: { komponen: Settings, label: "Pengaturan" },
  sun: { komponen: Sun, label: "Matahari / cerah" },
  sparkles: { komponen: Sparkles, label: "Kilau" },
  link: { komponen: Link2, label: "Hubungan" },
  check: { komponen: CheckCircle2, label: "Centang" },
  arrow: { komponen: ArrowRight, label: "Panah" },
};

export const DAFTAR_IKON = Object.entries(IKON).map(([nilai, { label }]) => ({ nilai, label }));

/** Menggambar ikon berdasarkan namanya. Nama yang tidak dikenal jatuh ke bawaan. */
export function Ikon({
  nama,
  size = 20,
  bawaan = "sparkles",
}: {
  nama: string | null | undefined;
  size?: number;
  bawaan?: string;
}) {
  const pilihan = IKON[nama ?? ""] ?? IKON[bawaan] ?? IKON.sparkles;
  const Komponen = pilihan.komponen;
  return <Komponen size={size} strokeWidth={1.9} aria-hidden />;
}
