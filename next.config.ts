import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Don't auto-generate AGENTS.md / CLAUDE.md — this project manages its
  // own docs.
  agentRules: false,

  experimental: {
    // Next.js menahan badan permintaan di memori selama ada berkas
    // middleware, dan bawaannya 10 MB — APK mitra saat ini 28 MB, jadi
    // unggahannya terpotong dan gagal dibaca tanpa ini.
    //
    // 110 MB, bukan angka besar sembarangan: APK-nya 28 MB dan tidak akan
    // mendekati angka ini. Batas yang longgar berarti siapa pun yang bisa
    // mencapai aplikasi bisa membuatnya menahan sekian ratus megabita di
    // memori. Gerbang luarnya tetap Nginx, yang hanya melonggarkan batas
    // pada satu alamat unggahan APK saja.
    proxyClientMaxBodySize: "110mb",
  },
};

export default nextConfig;
