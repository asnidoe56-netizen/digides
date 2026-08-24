import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "DigiDes — Platform PPOB BUMDes",
  description: "Fondasi Next.js + TypeScript + PostgreSQL untuk DigiDes.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="id">
      <body className="antialiased">{children}</body>
    </html>
  );
}
