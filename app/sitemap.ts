import type { MetadataRoute } from "next";
import { getD1 } from "../db/d1";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const routes = await getD1().prepare("SELECT id FROM routes WHERE active = 1").all<{ id: string }>();
  const now = new Date();
  return [
    { url: "https://busselect.jp", lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: "https://busselect.jp/search", lastModified: now, changeFrequency: "daily", priority: 0.8 },
    ...routes.results.map((route) => ({ url: `https://busselect.jp/routes/${route.id.replace(/^route-/, "")}`, lastModified: now, changeFrequency: "daily" as const, priority: 0.9 })),
  ];
}
