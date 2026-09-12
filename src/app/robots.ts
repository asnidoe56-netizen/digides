import type { MetadataRoute } from "next";

const SITE_URL = process.env.APP_URL ?? "https://digidespay.pro";

// Yang boleh diindeks hanya halaman depan. Selebihnya adalah dasbor dan
// endpoint yang butuh sesi — tidak ada gunanya muncul di hasil pencarian,
// dan alamatnya sendiri sudah memberi tahu lebih banyak dari yang perlu.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/dashboard/"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
