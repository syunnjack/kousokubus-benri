export type GeoPoint = { lat: number; lng: number; label: string };

export async function geocodePlace(query: string): Promise<GeoPoint | null> {
  const trimmed = query.trim().slice(0, 120);
  if (!trimmed) return null;

  const endpoint = new URL("https://nominatim.openstreetmap.org/search");
  endpoint.searchParams.set("q", trimmed);
  endpoint.searchParams.set("format", "json");
  endpoint.searchParams.set("limit", "1");
  endpoint.searchParams.set("countrycodes", "jp");

  const response = await fetch(endpoint, {
    headers: {
      "accept-language": "ja",
      "user-agent": "busselect.jp/1.0 (route search; contact@busselect.jp)",
    },
  });
  if (!response.ok) return null;

  const rows = (await response.json()) as Array<{ lat?: string; lon?: string; display_name?: string }>;
  const hit = rows[0];
  if (!hit?.lat || !hit?.lon) return null;

  return {
    lat: Number(hit.lat),
    lng: Number(hit.lon),
    label: hit.display_name?.split(",").slice(0, 2).join("，") || trimmed,
  };
}

export async function fetchRoutePolyline(
  start: GeoPoint,
  end: GeoPoint,
  profile: "foot" | "driving" = "foot",
): Promise<[number, number][]> {
  const path = `${start.lng},${start.lat};${end.lng},${end.lat}`;
  const endpoint = `https://router.project-osrm.org/route/v1/${profile}/${path}?overview=full&geometries=geojson`;

  try {
    const response = await fetch(endpoint, { headers: { accept: "application/json" } });
    if (!response.ok) return fallbackLine(start, end);
    const data = (await response.json()) as {
      routes?: Array<{ geometry?: { coordinates?: [number, number][] } }>;
    };
    const coords = data.routes?.[0]?.geometry?.coordinates;
    if (!coords?.length) return fallbackLine(start, end);
    return coords.map(([lng, lat]) => [lat, lng]);
  } catch {
    return fallbackLine(start, end);
  }
}

function fallbackLine(start: GeoPoint, end: GeoPoint): [number, number][] {
  return [
    [start.lat, start.lng],
    [end.lat, end.lng],
  ];
}
