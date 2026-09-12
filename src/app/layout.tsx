import type { Metadata } from "next";
import "./globals.css";

// Alamat resmi situs. Dipakai Next.js untuk menyusun URL mutlak pada Open
// Graph dan sitemap — tanpa ini, tautan yang dibagikan di WhatsApp akan
// menunjuk ke `localhost`. Di server nilainya datang dari APP_URL.
const SITE_URL = process.env.APP_URL ?? "https://digidespay.pro";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "DigidesPay — Jadikan BUMDes sumber pendapatan desa",
    template: "%s · DigidesPay",
  },
  description:
    "Jual pulsa, token listrik, pembayaran tagihan, dan isi saldo e-wallet dari warung atau kantor BUMDes Anda. Satu aplikasi, satu saldo, semuanya tercatat.",
  applicationName: "DigidesPay",
  keywords: [
    "BUMDes",
    "PPOB desa",
    "agen pulsa",
    "token listrik",
    "bayar tagihan",
    "aplikasi konter",
  ],
  openGraph: {
    type: "website",
    locale: "id_ID",
    url: SITE_URL,
    siteName: "DigidesPay",
    title: "DigidesPay — Jadikan BUMDes sumber pendapatan desa",
    description:
      "Pulsa, token listrik, tagihan, dan isi saldo e-wallet — layanan yang dicari warga setiap hari, dijual dari warung Anda sendiri.",
    images: [{ url: "/logos/digidespay.jpg", width: 1200, height: 630, alt: "DigidesPay" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "DigidesPay — Jadikan BUMDes sumber pendapatan desa",
    description:
      "Pulsa, token listrik, tagihan, dan isi saldo e-wallet, dijual dari warung Anda sendiri.",
    images: ["/logos/digidespay.jpg"],
  },
  icons: { icon: "/logos/digidespay.jpg" },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="id-ID">
      <body className="antialiased">{children}</body>
    </html>
  );
}
