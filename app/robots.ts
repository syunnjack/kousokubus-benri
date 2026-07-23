import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/admin/", "/api/"] }],
    sitemap: "https://busselect.jp/sitemap.xml",
    host: "https://busselect.jp",
  };
}
