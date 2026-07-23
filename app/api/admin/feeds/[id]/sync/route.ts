import { env } from "cloudflare:workers";
import { getChatGPTUser } from "../../../../../chatgpt-auth";
import { isNoluAdmin } from "../../../../../admin-auth";
import { getD1, jsonError } from "../../../../../../db/d1";

type FeedRow = Record<string, unknown>;
type ParsedRow = { externalKey: string; originName: string; destinationName: string; routeSlug: string; operatorName: string; serviceName: string; departureTime: string; arrivalTime: string; seatType: string | null; basePrice: number; sleepScore: number | null; onTimeRate: number | null; bookingUrl: string | null; salesStatus: string; availableSeats: number | null };

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getChatGPTUser();
  if (!user) return jsonError("Sign in is required", 401);
  if (!isNoluAdmin(user)) return jsonError("Administrator access is required", 403);
  const { id } = await context.params;
  const db = getD1();
  const feed = await db.prepare(`SELECT name, source_key AS sourceKey, endpoint_url AS endpointUrl, secret_env_name AS secretEnvName, enabled, feed_type AS feedType FROM feed_sources WHERE id = ?1`)
    .bind(id).first<{ name: string; sourceKey: string; endpointUrl: string | null; secretEnvName: string | null; enabled: number; feedType: string }>();
  if (!feed) return jsonError("提供元が見つかりません", 404);
  if (!feed.enabled) return jsonError("停止中の提供元です", 409);
  if (feed.feedType !== "api" || !feed.endpointUrl) return jsonError("API方式と接続先URLを設定してください", 422);
  if (!isPublicHttpsUrl(feed.endpointUrl)) return jsonError("安全でない接続先URLです", 422);

  const headers = new Headers({ accept: "application/json", "user-agent": "NOLU-Feed-Sync/1.0" });
  if (feed.secretEnvName) {
    const secret = (env as unknown as Record<string, unknown>)[feed.secretEnvName];
    if (typeof secret !== "string" || !secret) return jsonError(`本番環境に ${feed.secretEnvName} が設定されていません`, 422);
    headers.set("authorization", `Bearer ${secret}`);
  }
  const runId = crypto.randomUUID(), now = Date.now();
  try {
    const response = await fetch(feed.endpointUrl, { headers, signal: AbortSignal.timeout(15000) });
    if (!response.ok) throw new Error(`接続先が HTTP ${response.status} を返しました`);
    const payload = await response.json() as unknown;
    const rows = Array.isArray(payload) ? payload : isRecord(payload) && Array.isArray(payload.services) ? payload.services : null;
    if (!rows) throw new Error("レスポンスは配列または { services: [] } 形式が必要です");
    if (rows.length > 500) throw new Error("一度に同期できるのは500件までです");
    let inserted = 0, updated = 0;
    const errors: { row: number; message: string }[] = [];
    for (let offset = 0; offset < rows.length; offset += 40) {
      const valid = rows.slice(offset, offset + 40).map((row, index) => {
        const parsed = validate(row as FeedRow);
        if (typeof parsed === "string") errors.push({ row: offset + index + 1, message: parsed });
        return typeof parsed === "string" ? null : parsed;
      }).filter(Boolean) as ParsedRow[];
      if (!valid.length) continue;
      const existing = await db.prepare(`SELECT external_key AS externalKey FROM services WHERE external_key IN (${valid.map((_, index) => `?${index + 1}`).join(",")})`).bind(...valid.map((row) => row.externalKey)).all<{ externalKey: string }>();
      const keys = new Set((existing.results || []).map((row) => row.externalKey));
      inserted += valid.filter((row) => !keys.has(row.externalKey)).length;
      updated += valid.filter((row) => keys.has(row.externalKey)).length;
      await db.batch(valid.flatMap((row) => {
        const routeId = `route-${row.routeSlug}`;
        return [
          db.prepare(`INSERT INTO routes (id, origin_name, destination_name, active, created_at) VALUES (?1, ?2, ?3, 1, ?4) ON CONFLICT(id) DO UPDATE SET origin_name=excluded.origin_name, destination_name=excluded.destination_name, active=1`).bind(routeId, row.originName, row.destinationName, now),
          db.prepare(`INSERT INTO services (id, external_key, source, active, route_id, operator_name, service_name, departure_time, arrival_time, seat_type, base_price, sleep_score, on_time_rate, booking_url, sales_status, available_seats, fare_updated_at, updated_at)
            VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17, ?18)
            ON CONFLICT(external_key) DO UPDATE SET source=excluded.source, active=excluded.active, route_id=excluded.route_id, operator_name=excluded.operator_name, service_name=excluded.service_name, departure_time=excluded.departure_time, arrival_time=excluded.arrival_time, seat_type=excluded.seat_type, base_price=excluded.base_price, sleep_score=excluded.sleep_score, on_time_rate=excluded.on_time_rate, booking_url=excluded.booking_url, sales_status=excluded.sales_status, available_seats=excluded.available_seats, fare_updated_at=excluded.fare_updated_at, updated_at=excluded.updated_at`)
            .bind(`service-api-${crypto.randomUUID()}`, row.externalKey, feed.sourceKey, row.salesStatus === "ended" ? 0 : 1, routeId, row.operatorName, row.serviceName, row.departureTime, row.arrivalTime, row.seatType, row.basePrice, row.sleepScore, row.onTimeRate, row.bookingUrl, row.salesStatus, row.availableSeats, now, now),
        ];
      }));
    }
    const status = errors.length === rows.length ? "failed" : errors.length ? "partial" : "success";
    await db.batch([
      db.prepare(`INSERT INTO import_runs (id, source_key, file_name, status, total_rows, inserted_rows, updated_rows, error_rows, error_summary, imported_by, created_at) VALUES (?1, ?2, 'API sync', ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)`).bind(runId, feed.sourceKey, status, rows.length, inserted, updated, errors.length, JSON.stringify(errors.slice(0, 20)), user.email || null, now),
      db.prepare("UPDATE feed_sources SET last_imported_at = ?1 WHERE id = ?2").bind(now, id),
    ]);
    return Response.json({ ok: status === "success", status, total: rows.length, inserted, updated, errors });
  } catch (error) {
    const message = error instanceof Error ? error.message.slice(0, 300) : "同期に失敗しました";
    await db.prepare(`INSERT INTO import_runs (id, source_key, file_name, status, total_rows, error_rows, error_summary, imported_by, created_at) VALUES (?1, ?2, 'API sync', 'failed', 0, 1, ?3, ?4, ?5)`).bind(runId, feed.sourceKey, JSON.stringify([{ message }]), user.email || null, now).run();
    return jsonError(message, 502);
  }
}

function validate(row: FeedRow): ParsedRow | string {
  const str = (value: unknown, max: number) => typeof value === "string" ? value.trim().slice(0, max) : "";
  const externalKey = str(row.externalKey, 120), originName = str(row.originName, 40), destinationName = str(row.destinationName, 40);
  const routeSlug = str(row.routeSlug, 60).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const operatorName = str(row.operatorName, 80), serviceName = str(row.serviceName, 100), departureTime = str(row.departureTime, 5), arrivalTime = str(row.arrivalTime, 5), basePrice = Number(row.basePrice);
  if (!externalKey || !originName || !destinationName || !routeSlug || !operatorName || !serviceName || !validTime(departureTime) || !validTime(arrivalTime) || !Number.isInteger(basePrice) || basePrice < 1 || basePrice > 200000) return "必須項目・時刻・運賃を確認してください";
  const salesStatus = ["on_sale", "sold_out", "ended", "unknown"].includes(String(row.salesStatus)) ? String(row.salesStatus) : "unknown";
  const seats = row.availableSeats === "" || row.availableSeats == null ? null : Number(row.availableSeats);
  if (seats !== null && (!Number.isInteger(seats) || seats < 0 || seats > 999)) return "availableSeatsは0〜999の整数です";
  const bookingUrl = str(row.bookingUrl, 500);
  if (bookingUrl && !isPublicHttpsUrl(bookingUrl)) return "bookingUrlは公開https URLが必要です";
  const sleep = optionalNumber(row.sleepScore, 0, 100), punctuality = optionalNumber(row.onTimeRate, 0, 100);
  if (sleep === false || punctuality === false) return "スコアは0〜100で指定してください";
  return { externalKey, originName, destinationName, routeSlug, operatorName, serviceName, departureTime, arrivalTime, seatType: str(row.seatType, 40) || null, basePrice, sleepScore: sleep, onTimeRate: punctuality === null ? null : punctuality / 100, bookingUrl: bookingUrl || null, salesStatus, availableSeats: seats };
}
function optionalNumber(value: unknown, min: number, max: number): number | null | false { if (value === "" || value == null) return null; const number = Number(value); return Number.isFinite(number) && number >= min && number <= max ? number : false; }
function validTime(value: string) { return /^([01]\d|2[0-3]):[0-5]\d$/.test(value); }
function isRecord(value: unknown): value is Record<string, unknown> { return typeof value === "object" && value !== null; }
function isPublicHttpsUrl(value: string) { try { const url = new URL(value); return url.protocol === "https:" && url.hostname !== "localhost" && !/^\d{1,3}(?:\.\d{1,3}){3}$/.test(url.hostname) && !url.hostname.endsWith(".local"); } catch { return false; } }
