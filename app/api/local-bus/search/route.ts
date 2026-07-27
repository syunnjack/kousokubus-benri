import { getD1, jsonError } from "../../../../db/d1";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const query = (url.searchParams.get("q") || "").trim().slice(0, 50);
  if (query.length < 1) return jsonError("q is required", 422);
  const like = `%${query.replace(/[\\%_]/g, "\\$&")}%`;
  const db = getD1();
  const [stops, lines] = await Promise.all([
    db.prepare(`SELECT s.id, s.name, s.code, s.latitude, s.longitude, a.name AS agencyName,
      (SELECT COUNT(DISTINCT st.trip_id) FROM bus_stop_times st WHERE st.stop_id = s.id) AS tripCount
      FROM bus_stops s JOIN bus_agencies a ON a.id = s.agency_id
      WHERE s.name LIKE ?1 ESCAPE '\\' OR s.code LIKE ?1 ESCAPE '\\'
      ORDER BY tripCount DESC, s.name LIMIT 30`).bind(like).all(),
    db.prepare(`SELECT l.id, l.short_name AS shortName, l.long_name AS longName, l.color,
      a.name AS agencyName, COUNT(t.id) AS tripCount
      FROM bus_lines l JOIN bus_agencies a ON a.id = l.agency_id
      LEFT JOIN bus_trips t ON t.line_id = l.id
      WHERE l.short_name LIKE ?1 ESCAPE '\\' OR l.long_name LIKE ?1 ESCAPE '\\'
      GROUP BY l.id ORDER BY tripCount DESC LIMIT 20`).bind(like).all(),
  ]);
  return Response.json({ ok: true, query, stops: stops.results, lines: lines.results });
}
