import type { MetadataRoute } from "next";
import { getD1 } from "../db/d1";
import { siteUrl } from "../lib/site";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const routes = await getD1().prepare(`SELECT r.id, r.origin_name AS originName, r.destination_name AS destinationName, MAX(s.updated_at) AS updatedAt
    FROM routes r LEFT JOIN services s ON s.route_id = r.id WHERE r.active = 1 GROUP BY r.id`).all<{ id: string; originName: string; destinationName: string; updatedAt: number | null }>();
  const now = new Date();
  const cities = [...new Set(routes.results.flatMap((route) => [route.originName, route.destinationName]))];
  const busStops = await getD1().prepare("SELECT id, updated_at AS updatedAt FROM bus_stops ORDER BY updated_at DESC LIMIT 50000").all<{ id: string; updatedAt: number }>();
  return [
    { url: siteUrl(), lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: siteUrl("/routes"), lastModified: now, changeFrequency: "daily", priority: 0.9 },
    { url: siteUrl("/local-bus"), lastModified: now, changeFrequency: "daily", priority: 0.9 },
    { url: siteUrl("/onward"), lastModified: now, changeFrequency: "weekly", priority: 0.85 },
    { url: siteUrl("/about"), lastModified: now, changeFrequency: "monthly", priority: 0.5 },
    { url: siteUrl("/privacy"), lastModified: now, changeFrequency: "monthly", priority: 0.3 },
    ...cities.map((city) => ({ url: siteUrl(`/areas/${encodeURIComponent(city)}`), lastModified: now, changeFrequency: "daily" as const, priority: 0.8 })),
    ...routes.results.map((route) => ({ url: siteUrl(`/routes/${route.id.replace(/^route-/, "")}`), lastModified: route.updatedAt ? new Date(route.updatedAt) : now, changeFrequency: "daily" as const, priority: 0.9 })),
    ...busStops.results.map((stop) => ({ url: siteUrl(`/local-bus/stops/${encodeURIComponent(stop.id)}`), lastModified: new Date(stop.updatedAt), changeFrequency: "weekly" as const, priority: 0.6 })),
  ];
}
