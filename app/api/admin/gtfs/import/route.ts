import { env } from "cloudflare:workers";
import { getChatGPTUser } from "../../../../chatgpt-auth";
import { isNoluAdmin } from "../../../../admin-auth";
import { asString, getD1, jsonError } from "../../../../../db/d1";

type Entity = "agency" | "stops" | "lines" | "calendars" | "calendarDates" | "trips" | "stopTimes" | "complete";

export async function POST(request: Request) {
  const user = await getChatGPTUser();
  const secret = (env as unknown as Record<string, unknown>).NOLU_CRON_SECRET;
  const automation = typeof secret === "string" && secret.length >= 32 && request.headers.get("authorization") === `Bearer ${secret}`;
  if (!automation && !user) return jsonError("Sign in is required", 401);
  if (user && !isNoluAdmin(user)) return jsonError("Administrator access is required", 403);
  const body = await request.json().catch(() => null) as { entity?: Entity; sourceKey?: unknown; rows?: Record<string, unknown>[]; metadata?: Record<string, unknown> } | null;
  const entity = body?.entity;
  const sourceKey = key(asString(body?.sourceKey, 60));
  if (!entity || !sourceKey) return jsonError("entity and sourceKey are required", 422);
  if (entity === "complete") return complete(sourceKey, body?.metadata || {}, automation ? "gtfs-scheduler" : user?.email || "admin");
  if (!Array.isArray(body?.rows) || !body.rows.length || body.rows.length > 300) return jsonError("rows must contain 1-300 items", 422);

  const db = getD1();
  const now = Date.now();
  const statements = body.rows.map((row) => statement(entity, sourceKey, row, now));
  if (statements.some((item) => typeof item === "string")) {
    const index = statements.findIndex((item) => typeof item === "string");
    return jsonError(`${index + 1}行目: ${statements[index]}`, 422);
  }
  await db.batch(statements as D1PreparedStatement[]);
  return Response.json({ ok: true, entity, imported: statements.length });
}

function statement(entity: Exclude<Entity, "complete">, sourceKey: string, row: Record<string, unknown>, now: number): D1PreparedStatement | string {
  const db = getD1();
  const id = namespaced(sourceKey, row.id);
  if (!id) return "id is required";
  if (entity === "agency") {
    const name = asString(row.name, 120);
    if (!name) return "name is required";
    return db.prepare(`INSERT INTO bus_agencies (id, source_key, name, url, timezone, language, license_name, license_url, attribution, feed_url, updated_at)
      VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)
      ON CONFLICT(id) DO UPDATE SET name=excluded.name, url=excluded.url, timezone=excluded.timezone, language=excluded.language, license_name=excluded.license_name, license_url=excluded.license_url, attribution=excluded.attribution, feed_url=excluded.feed_url, updated_at=excluded.updated_at`)
      .bind(id, sourceKey, name, url(row.url), asString(row.timezone, 60) || "Asia/Tokyo", asString(row.language, 10) || "ja", asString(row.licenseName, 100) || null, url(row.licenseUrl), asString(row.attribution, 200) || null, url(row.feedUrl), now);
  }
  if (entity === "stops") {
    const name = asString(row.name, 120), lat = number(row.latitude, -90, 90), lon = number(row.longitude, -180, 180);
    if (!name || lat === null || lon === null) return "name, latitude and longitude are required";
    return db.prepare(`INSERT INTO bus_stops (id, agency_id, name, code, description, latitude, longitude, location_type, parent_station, wheelchair_boarding, updated_at)
      VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)
      ON CONFLICT(id) DO UPDATE SET name=excluded.name, code=excluded.code, description=excluded.description, latitude=excluded.latitude, longitude=excluded.longitude, location_type=excluded.location_type, parent_station=excluded.parent_station, wheelchair_boarding=excluded.wheelchair_boarding, updated_at=excluded.updated_at`)
      .bind(id, namespaced(sourceKey, row.agencyId), name, asString(row.code, 60) || null, asString(row.description, 300) || null, lat, lon, integer(row.locationType, 0), namespaced(sourceKey, row.parentStation) || null, nullableInteger(row.wheelchairBoarding), now);
  }
  if (entity === "lines") {
    const shortName = asString(row.shortName, 80), longName = asString(row.longName, 160);
    if (!shortName && !longName) return "shortName or longName is required";
    return db.prepare(`INSERT INTO bus_lines (id, agency_id, short_name, long_name, description, route_type, color, text_color, updated_at)
      VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)
      ON CONFLICT(id) DO UPDATE SET agency_id=excluded.agency_id, short_name=excluded.short_name, long_name=excluded.long_name, description=excluded.description, route_type=excluded.route_type, color=excluded.color, text_color=excluded.text_color, updated_at=excluded.updated_at`)
      .bind(id, namespaced(sourceKey, row.agencyId), shortName || null, longName || null, asString(row.description, 300) || null, integer(row.routeType, 3), color(row.color), color(row.textColor), now);
  }
  if (entity === "calendars") {
    const startDate = date(asString(row.startDate, 8)), endDate = date(asString(row.endDate, 8));
    if (!startDate || !endDate) return "startDate and endDate are required";
    return db.prepare(`INSERT INTO bus_calendars (id, monday, tuesday, wednesday, thursday, friday, saturday, sunday, start_date, end_date)
      VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)
      ON CONFLICT(id) DO UPDATE SET monday=excluded.monday, tuesday=excluded.tuesday, wednesday=excluded.wednesday, thursday=excluded.thursday, friday=excluded.friday, saturday=excluded.saturday, sunday=excluded.sunday, start_date=excluded.start_date, end_date=excluded.end_date`)
      .bind(id, flag(row.monday), flag(row.tuesday), flag(row.wednesday), flag(row.thursday), flag(row.friday), flag(row.saturday), flag(row.sunday), startDate, endDate);
  }
  if (entity === "calendarDates") {
    const serviceDate = date(asString(row.date, 8)), serviceId = namespaced(sourceKey, row.serviceId), exceptionType = integer(row.exceptionType, 0);
    if (!serviceDate || !serviceId || ![1, 2].includes(exceptionType)) return "serviceId, date and exceptionType are required";
    return db.prepare(`INSERT INTO bus_calendar_dates (id, service_id, date, exception_type) VALUES (?1, ?2, ?3, ?4)
      ON CONFLICT(service_id, date) DO UPDATE SET exception_type=excluded.exception_type`).bind(`${serviceId}:${serviceDate}`, serviceId, serviceDate, exceptionType);
  }
  if (entity === "trips") {
    return db.prepare(`INSERT INTO bus_trips (id, line_id, service_id, headsign, short_name, direction_id, wheelchair_accessible, bikes_allowed, updated_at)
      VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)
      ON CONFLICT(id) DO UPDATE SET line_id=excluded.line_id, service_id=excluded.service_id, headsign=excluded.headsign, short_name=excluded.short_name, direction_id=excluded.direction_id, wheelchair_accessible=excluded.wheelchair_accessible, bikes_allowed=excluded.bikes_allowed, updated_at=excluded.updated_at`)
      .bind(id, namespaced(sourceKey, row.lineId), namespaced(sourceKey, row.serviceId), asString(row.headsign, 160) || null, asString(row.shortName, 80) || null, nullableInteger(row.directionId), nullableInteger(row.wheelchairAccessible), nullableInteger(row.bikesAllowed), now);
  }
  const sequence = integer(row.stopSequence, -1);
  const arrival = time(asString(row.arrivalTime, 8)), departure = time(asString(row.departureTime, 8));
  if (sequence < 0 || !arrival || !departure) return "stopSequence, arrivalTime and departureTime are required";
  return db.prepare(`INSERT INTO bus_stop_times (id, trip_id, stop_id, arrival_time, departure_time, stop_sequence, pickup_type, drop_off_type, timepoint)
    VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)
    ON CONFLICT(trip_id, stop_sequence) DO UPDATE SET stop_id=excluded.stop_id, arrival_time=excluded.arrival_time, departure_time=excluded.departure_time, pickup_type=excluded.pickup_type, drop_off_type=excluded.drop_off_type, timepoint=excluded.timepoint`)
    .bind(`${id}:${sequence}`, namespaced(sourceKey, row.tripId), namespaced(sourceKey, row.stopId), arrival, departure, sequence, integer(row.pickupType, 0), integer(row.dropOffType, 0), nullableInteger(row.timepoint));
}

async function complete(sourceKey: string, metadata: Record<string, unknown>, actor: string) {
  const db = getD1();
  const counts = await db.prepare(`SELECT
    (SELECT COUNT(*) FROM bus_agencies WHERE source_key = ?1) AS agencies,
    (SELECT COUNT(*) FROM bus_stops WHERE agency_id LIKE ?2) AS stops,
    (SELECT COUNT(*) FROM bus_lines WHERE agency_id LIKE ?2) AS lines,
    (SELECT COUNT(*) FROM bus_trips WHERE id LIKE ?2) AS trips,
    (SELECT COUNT(*) FROM bus_stop_times WHERE trip_id LIKE ?2) AS stopTimes`).bind(sourceKey, `${sourceKey}:%`).first<Record<string, number>>();
  await db.prepare(`INSERT INTO import_runs (id, source_key, file_name, status, total_rows, inserted_rows, updated_rows, error_rows, error_summary, imported_by, created_at)
    VALUES (?1, ?2, ?3, 'success', ?4, ?4, 0, 0, ?5, ?6, ?7)`)
    .bind(crypto.randomUUID(), sourceKey, asString(metadata.feedName, 160) || "GTFS-JP", Object.values(counts || {}).reduce((sum, value) => sum + Number(value || 0), 0), JSON.stringify({ license: metadata.licenseName || null, counts }), actor, Date.now()).run();
  return Response.json({ ok: true, sourceKey, counts });
}

function key(value: string) { return value.toLowerCase().replace(/[^a-z0-9_-]+/g, "-").replace(/^-|-$/g, ""); }
function namespaced(source: string, value: unknown) { const raw = asString(value, 180); return raw ? `${source}:${raw}` : ""; }
function number(value: unknown, min: number, max: number) { const parsed = Number(value); return Number.isFinite(parsed) && parsed >= min && parsed <= max ? parsed : null; }
function integer(value: unknown, fallback: number) { const parsed = Number(value); return Number.isInteger(parsed) ? parsed : fallback; }
function nullableInteger(value: unknown) { if (value === "" || value == null) return null; return integer(value, 0); }
function time(value: string) { return /^\d{1,2}:[0-5]\d:[0-5]\d$/.test(value) ? value.padStart(8, "0") : ""; }
function date(value: string) { return /^\d{8}$/.test(value) ? value : ""; }
function flag(value: unknown) { return String(value) === "1" ? 1 : 0; }
function color(value: unknown) { const text = asString(value, 6).toUpperCase(); return /^[0-9A-F]{6}$/.test(text) ? text : null; }
function url(value: unknown) { const text = asString(value, 500); if (!text) return null; try { const parsed = new URL(text); return parsed.protocol === "https:" || parsed.protocol === "http:" ? parsed.toString() : null; } catch { return null; } }
