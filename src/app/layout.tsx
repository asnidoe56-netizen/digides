import type { Metadata } from "next";
import "./globals.css";

// Alamat resmi situs. Dipakai Next.js untuk menyusun URL mutlak pada Open
// Graph dan sitemap — tanpa ini, tautan yang dibagikan di WhatsApp akan
// menunjuk ke `localhost`. Di server nilainya datang dari APP_URL.
const SITE_URL = process.env.APP_URL ?? "https://digidespay.pro";

/**
 * Metadata dasar untuk seluruh aplikasi.
 *
 * Yang khusus halaman depan — judul, keterangan, Open Graph, kartu Twitter —
 * SENGAJA tidak ada di sini. Semuanya datang dari basis data lewat
 * `generateMetadata` di `page.tsx`, supaya bisa diubah dari halaman admin.
 * Menyalinnya di dua tempat berarti suatu hari keduanya berbeda, dan yang
 * ketahuan belakangan adalah yang dibaca mesin pencari.
 */
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "DIGIDES PAY",
    template: "%s · DIGIDES PAY",
  },
  applicationName: "DIGIDES PAY",
  icons: { icon: "/logos/digidespay.jpg" },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="id-ID">
      <body className="antialiased">{children}</body>
    </html>
  );
}
