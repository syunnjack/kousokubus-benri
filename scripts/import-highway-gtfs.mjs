import { readFile } from "node:fs/promises";
import { join } from "node:path";

const [sourceKey, directory, metadataPath] = process.argv.slice(2);
const baseUrl = process.env.NOLU_BASE_URL, secret = process.env.NOLU_CRON_SECRET;
if (!sourceKey || !directory || !metadataPath || !baseUrl || !secret) throw new Error("sourceKey, directory, metadata, NOLU_BASE_URL and NOLU_CRON_SECRET are required");
const metadata = JSON.parse((await readFile(metadataPath, "utf8")).replace(/^\uFEFF/, ""));
const [agencies, routes, trips, stops, stopTimes] = await Promise.all(["agency", "routes", "trips", "stops", "stop_times"].map(async (name) => parseCsv(await readFile(join(directory, `${name}.txt`), "utf8"))));
const agencyNames = new Map(agencies.map((row) => [row.agency_id || "default", row.agency_name]));
const routeMap = new Map(routes.map((row) => [row.route_id, row]));
const stopMap = new Map(stops.map((row) => [row.stop_id, row.stop_name]));
const timesByTrip = new Map();
for (const row of stopTimes) {
  const list = timesByTrip.get(row.trip_id) || [];
  list.push(row); timesByTrip.set(row.trip_id, list);
}
const highwayPattern = /高速|夜行|ライナー|空港|エアポート|シャトル|express|highway|airport/i;
// 語句は一致するが高速バスではないもの。高速“船”・渡船、乗合タクシー、
// 空港敷地内の貨物循環などが highwayPattern に引っかかるため除外する。
const excludedPattern = /高速船|フェリー|渡船|乗合タクシー|貨物/;
const rows = [];
for (const trip of trips) {
  const route = routeMap.get(trip.route_id); if (!route) continue;
  const descriptor = [route.route_short_name, route.route_long_name, route.route_desc, trip.trip_headsign].filter(Boolean).join(" ");
  if (!highwayPattern.test(descriptor) || excludedPattern.test(descriptor)) continue;
  const times = (timesByTrip.get(trip.trip_id) || []).sort((a, b) => Number(a.stop_sequence) - Number(b.stop_sequence));
  if (times.length < 2) continue;
  const first = times[0], last = times[times.length - 1];
  rows.push({
    externalKey: trip.trip_id,
    operatorName: agencyNames.get(route.agency_id || agencies[0]?.agency_id || "default") || metadata.attribution,
    serviceName: route.route_long_name || route.route_short_name || trip.trip_headsign || "高速バス",
    originName: stopMap.get(first.stop_id), destinationName: stopMap.get(last.stop_id),
    departureTime: first.departure_time, arrivalTime: last.arrival_time,
    officialUrl: metadata.officialUrl, licenseName: metadata.licenseName, licenseUrl: metadata.licenseUrl,
  });
}
for (let offset = 0; offset < rows.length; offset += 200) {
  const response = await fetch(`${baseUrl}/api/admin/highway/import`, { method: "POST", headers: { authorization: `Bearer ${secret}`, "content-type": "application/json" }, body: JSON.stringify({ sourceKey, rows: rows.slice(offset, offset + 200) }) });
  if (!response.ok) throw new Error(`${response.status} ${await response.text()}`);
}
process.stdout.write(`${sourceKey}: ${rows.length.toLocaleString()} highway trips imported\n`);

function parseCsv(text) {
  const rows = []; let row = [], value = "", quoted = false; const input = text.replace(/^\uFEFF/, "");
  for (let i = 0; i < input.length; i++) { const char = input[i];
    if (quoted && char === '"' && input[i + 1] === '"') { value += '"'; i++; }
    else if (char === '"') quoted = !quoted;
    else if (char === "," && !quoted) { row.push(value); value = ""; }
    else if ((char === "\n" || char === "\r") && !quoted) { if (char === "\r" && input[i + 1] === "\n") i++; row.push(value); value = ""; if (row.some(Boolean)) rows.push(row); row = []; }
    else value += char;
  }
  row.push(value); if (row.some(Boolean)) rows.push(row); if (!rows.length) return [];
  const headers = rows[0].map((header) => header.trim()); return rows.slice(1).map((values) => Object.fromEntries(headers.map((header, index) => [header, values[index]?.trim() || ""])));
}
