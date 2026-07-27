import { readFile } from "node:fs/promises";
import { join } from "node:path";

const [sourceKey, directory, metadataPath] = process.argv.slice(2);
const baseUrl = process.env.NOLU_BASE_URL;
const secret = process.env.NOLU_CRON_SECRET;
if (!sourceKey || !directory || !baseUrl || !secret) throw new Error("Usage: NOLU_BASE_URL=... NOLU_CRON_SECRET=... node scripts/import-gtfs.mjs <sourceKey> <directory> [metadata.json]");
const metadata = metadataPath ? JSON.parse(await readFile(metadataPath, "utf8")) : {};
const files = {};
for (const name of ["agency", "stops", "routes", "calendar", "calendar_dates", "trips", "stop_times", "feed_info"]) {
  try { files[name] = parseCsv(await readFile(join(directory, `${name}.txt`), "utf8")); } catch (error) { if (!["calendar", "calendar_dates", "feed_info"].includes(name)) throw error; files[name] = []; }
}
if (!files.calendar.length && !files.calendar_dates.length) throw new Error("calendar.txt or calendar_dates.txt is required");
const defaultAgency = files.agency[0]?.agency_id || "default";
const feedInfo = files.feed_info[0] || {};
const batches = [
  ["agency", files.agency.map((row) => ({ id: row.agency_id || defaultAgency, name: row.agency_name, url: row.agency_url, timezone: row.agency_timezone, language: row.agency_lang, licenseName: metadata.licenseName, licenseUrl: metadata.licenseUrl, attribution: metadata.attribution || row.agency_name, feedUrl: metadata.feedUrl }))],
  ["stops", files.stops.map((row) => ({ id: row.stop_id, agencyId: defaultAgency, name: row.stop_name, code: row.stop_code, description: row.stop_desc, latitude: row.stop_lat, longitude: row.stop_lon, locationType: row.location_type, parentStation: row.parent_station, wheelchairBoarding: row.wheelchair_boarding }))],
  ["lines", files.routes.map((row) => ({ id: row.route_id, agencyId: row.agency_id || defaultAgency, shortName: row.route_short_name, longName: row.route_long_name, description: row.route_desc, routeType: row.route_type, color: row.route_color, textColor: row.route_text_color }))],
  ["calendars", files.calendar.map((row) => ({ id: row.service_id, monday: row.monday, tuesday: row.tuesday, wednesday: row.wednesday, thursday: row.thursday, friday: row.friday, saturday: row.saturday, sunday: row.sunday, startDate: row.start_date, endDate: row.end_date }))],
  ["calendarDates", files.calendar_dates.map((row) => ({ id: `${row.service_id}:${row.date}`, serviceId: row.service_id, date: row.date, exceptionType: row.exception_type }))],
  ["trips", files.trips.map((row) => ({ id: row.trip_id, lineId: row.route_id, serviceId: row.service_id, headsign: row.trip_headsign, shortName: row.trip_short_name, directionId: row.direction_id, wheelchairAccessible: row.wheelchair_accessible, bikesAllowed: row.bikes_allowed }))],
  ["stopTimes", files.stop_times.map((row) => ({ id: row.trip_id, tripId: row.trip_id, stopId: row.stop_id, arrivalTime: row.arrival_time, departureTime: row.departure_time, stopSequence: row.stop_sequence, pickupType: row.pickup_type, dropOffType: row.drop_off_type, timepoint: row.timepoint }))],
];
let total = 0;
for (const [entity, rows] of batches) {
  for (let offset = 0; offset < rows.length; offset += 250) {
    const chunk = rows.slice(offset, offset + 250);
    const response = await fetch(`${baseUrl}/api/admin/gtfs/import`, { method: "POST", headers: { authorization: `Bearer ${secret}`, "content-type": "application/json" }, body: JSON.stringify({ entity, sourceKey, rows: chunk }) });
    if (!response.ok) throw new Error(`${entity} ${offset}: ${response.status} ${await response.text()}`);
    total += chunk.length;
    if (total % 5000 < 250) process.stdout.write(`${sourceKey}: ${total.toLocaleString()} rows imported\n`);
  }
}
const complete = await fetch(`${baseUrl}/api/admin/gtfs/import`, { method: "POST", headers: { authorization: `Bearer ${secret}`, "content-type": "application/json" }, body: JSON.stringify({ entity: "complete", sourceKey, metadata: { ...metadata, feedName: feedInfo.feed_publisher_name || metadata.feedName } }) });
if (!complete.ok) throw new Error(`complete: ${complete.status} ${await complete.text()}`);
process.stdout.write(`${sourceKey}: complete ${JSON.stringify(await complete.json())}\n`);

function parseCsv(text) {
  const rows = []; let row = [], value = "", quoted = false;
  const input = text.replace(/^\uFEFF/, "");
  for (let i = 0; i < input.length; i++) {
    const char = input[i];
    if (quoted && char === '"' && input[i + 1] === '"') { value += '"'; i++; }
    else if (char === '"') quoted = !quoted;
    else if (char === "," && !quoted) { row.push(value); value = ""; }
    else if ((char === "\n" || char === "\r") && !quoted) { if (char === "\r" && input[i + 1] === "\n") i++; row.push(value); value = ""; if (row.some((cell) => cell !== "")) rows.push(row); row = []; }
    else value += char;
  }
  row.push(value); if (row.some((cell) => cell !== "")) rows.push(row);
  if (!rows.length) return [];
  const headers = rows[0].map((header) => header.trim());
  return rows.slice(1).map((values) => Object.fromEntries(headers.map((header, index) => [header, values[index]?.trim() || ""])));
}
