import type { MetadataRoute } from "next";
import { getD1 } from "../db/d1";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const routes = await getD1().prepare(`SELECT r.id, r.origin_name AS originName, r.destination_name AS destinationName, MAX(s.updated_at) AS updatedAt
    FROM routes r LEFT JOIN services s ON s.route_id = r.id WHERE r.active = 1 GROUP BY r.id`).all<{ id: string; originName: string; destinationName: string; updatedAt: number | null }>();
  const now = new Date();
  const cities = [...new Set(routes.results.flatMap((route) => [route.originName, route.destinationName]))];
  const busStops = await getD1().prepare("SELECT id, updated_at AS updatedAt FROM bus_stops ORDER BY updated_at DESC LIMIT 50000").all<{ id: string; updatedAt: number }>();
  return [
    { url: "https://busselect.jp", lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: "https://busselect.jp/search", lastModified: now, changeFrequency: "daily", priority: 0.8 },
    { url: "https://busselect.jp/routes", lastModified: now, changeFrequency: "daily", priority: 0.9 },
    { url: "https://busselect.jp/local-bus", lastModified: now, changeFrequency: "daily", priority: 0.9 },
    { url: "https://busselect.jp/onward", lastModified: now, changeFrequency: "weekly", priority: 0.85 },
    ...cities.map((city) => ({ url: `https://busselect.jp/areas/${encodeURIComponent(city)}`, lastModified: now, changeFrequency: "daily" as const, priority: 0.8 })),
    ...routes.results.map((route) => ({ url: `https://busselect.jp/routes/${route.id.replace(/^route-/, "")}`, lastModified: route.updatedAt ? new Date(route.updatedAt) : now, changeFrequency: "daily" as const, priority: 0.9 })),
    ...busStops.results.map((stop) => ({ url: `https://busselect.jp/local-bus/stops/${encodeURIComponent(stop.id)}`, lastModified: new Date(stop.updatedAt), changeFrequency: "weekly" as const, priority: 0.6 })),
  ];
}
