import { getD1, jsonError } from "../../../../../../db/d1";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const url = new URL(request.url);
  const requestedDate = url.searchParams.get("date") || japanDate();
  if (!/^\d{8}$/.test(requestedDate)) return jsonError("date must be YYYYMMDD", 422);
  const weekday = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"][new Date(`${requestedDate.slice(0, 4)}-${requestedDate.slice(4, 6)}-${requestedDate.slice(6, 8)}T12:00:00+09:00`).getUTCDay()];
  const time = (url.searchParams.get("time") || japanTime()).replace(/^([0-9]):/, "0$1:").slice(0, 8);
  const db = getD1();
  const stop = await db.prepare(`SELECT s.id, s.name, s.code, s.latitude, s.longitude, a.name AS agencyName, a.attribution, a.license_name AS licenseName, a.license_url AS licenseUrl FROM bus_stops s JOIN bus_agencies a ON a.id = s.agency_id WHERE s.id = ?1`).bind(id).first();
  if (!stop) return jsonError("Stop not found", 404);
  const departures = await db.prepare(`SELECT st.departure_time AS departureTime, t.headsign, t.short_name AS tripName,
      l.short_name AS lineShortName, l.long_name AS lineLongName, l.color, a.name AS agencyName
    FROM bus_stop_times st
    JOIN bus_trips t ON t.id = st.trip_id
    JOIN bus_lines l ON l.id = t.line_id
    JOIN bus_agencies a ON a.id = l.agency_id
    LEFT JOIN bus_calendars c ON c.id = t.service_id
    WHERE st.stop_id = ?1 AND st.departure_time >= ?2
      AND (((c.start_date <= ?3 AND c.end_date >= ?3 AND c.${weekday} = 1)
        AND NOT EXISTS (SELECT 1 FROM bus_calendar_dates x WHERE x.service_id = t.service_id AND x.date = ?3 AND x.exception_type = 2))
        OR EXISTS (SELECT 1 FROM bus_calendar_dates x WHERE x.service_id = t.service_id AND x.date = ?3 AND x.exception_type = 1))
    ORDER BY st.departure_time LIMIT 60`).bind(id, time, requestedDate).all();
  return Response.json({ ok: true, stop, date: requestedDate, time, departures: departures.results });
}
function japanDate() { return new Intl.DateTimeFormat("ja-JP", { timeZone: "Asia/Tokyo", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date()).replaceAll("/", ""); }
function japanTime() { return new Intl.DateTimeFormat("ja-JP", { timeZone: "Asia/Tokyo", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }).format(new Date()); }
