import type { MetadataRoute } from "next";

const SITE_URL = process.env.APP_URL ?? "https://digidespay.pro";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: SITE_URL, lastModified: new Date(), changeFrequency: "monthly", priority: 1 },
    { url: `${SITE_URL}/register`, changeFrequency: "yearly", priority: 0.6 },
  ];
}
