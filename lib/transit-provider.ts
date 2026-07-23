import { env } from "cloudflare:workers";

export type TransitRequest = { startNodeId: string; goalNodeId: string; startTime: string };

export async function fetchNavitimeRoute(input: TransitRequest) {
  const runtime = env as unknown as { NAVITIME_API_HOST?: string; NAVITIME_CID?: string; NAVITIME_API_KEY?: string };
  if (!runtime.NAVITIME_API_HOST || !runtime.NAVITIME_CID || !runtime.NAVITIME_API_KEY) {
    return { configured: false as const, items: [] };
  }
  const endpoint = new URL(`https://${runtime.NAVITIME_API_HOST}/${runtime.NAVITIME_CID}/v1/route_transit`);
  endpoint.searchParams.set("start", input.startNodeId);
  endpoint.searchParams.set("goal", input.goalNodeId);
  endpoint.searchParams.set("start_time", input.startTime);
  const response = await fetch(endpoint, { headers: { "x-rapidapi-key": runtime.NAVITIME_API_KEY } });
  if (!response.ok) throw new Error(`Transit provider returned ${response.status}`);
  const data = await response.json() as { items?: unknown[] };
  return { configured: true as const, items: data.items || [] };
}
