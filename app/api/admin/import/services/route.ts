import { getChatGPTUser } from "../../../../chatgpt-auth";
import { isNoluAdmin } from "../../../../admin-auth";
import { asString, getD1, jsonError } from "../../../../../db/d1";

type ImportRow = {
  externalKey?: unknown;
  source?: unknown;
  originName?: unknown;
  destinationName?: unknown;
  routeSlug?: unknown;
  operatorName?: unknown;
  serviceName?: unknown;
  departureTime?: unknown;
  arrivalTime?: unknown;
  seatType?: unknown;
  basePrice?: unknown;
  sleepScore?: unknown;
  onTimeRate?: unknown;
  bookingUrl?: unknown;
  active?: unknown;
};

type ValidRow = {
  externalKey: string;
  source: string;
  originName: string;
  destinationName: string;
  routeSlug: string;
  operatorName: string;
  serviceName: string;
  departureTime: string;
  arrivalTime: string;
  seatType: string | null;
  basePrice: number;
  sleepScore: number | null;
  onTimeRate: number | null;
  bookingUrl: string | null;
  active: number;
};

export async function POST(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return jsonError("Sign in is required", 401);
  if (!isNoluAdmin(user)) return jsonError("Administrator access is required", 403);

  const body = await request.json().catch(() => null) as { rows?: ImportRow[]; fileName?: unknown } | null;
  if (!Array.isArray(body?.rows) || body.rows.length === 0) return jsonError("rows is required", 400);
  if (body.rows.length > 500) return jsonError("一度に取り込めるのは500件までです", 422);

  const errors: { row: number; message: string }[] = [];
  const valid: ValidRow[] = [];
  const seen = new Set<string>();
  body.rows.forEach((row, index) => {
    const parsed = validate(row);
    if (typeof parsed === "string") errors.push({ row: index + 2, message: parsed });
    else if (seen.has(parsed.externalKey)) errors.push({ row: index + 2, message: "externalKey がCSV内で重複しています" });
    else {
      seen.add(parsed.externalKey);
      valid.push(parsed);
    }
  });
  const sourceKey = valid[0]?.source || asString(body.rows[0]?.source, 50) || "csv";
  const fileName = asString(body.fileName, 160) || null;
  if (!valid.length) {
    await logRun(sourceKey, fileName, body.rows.length, 0, 0, errors, user.email);
    return Response.json({ ok: false, inserted: 0, updated: 0, errors }, { status: 422 });
  }

  const db = getD1();
  let inserted = 0;
  let updated = 0;
  for (let offset = 0; offset < valid.length; offset += 40) {
    const chunk = valid.slice(offset, offset + 40);
    const existing = await db.prepare(
      `SELECT external_key AS externalKey FROM services WHERE external_key IN (${chunk.map((_, index) => `?${index + 1}`).join(",")})`,
    ).bind(...chunk.map((row) => row.externalKey)).all<{ externalKey: string }>();
    const existingKeys = new Set((existing.results || []).map((row) => row.externalKey));
    inserted += chunk.filter((row) => !existingKeys.has(row.externalKey)).length;
    updated += chunk.filter((row) => existingKeys.has(row.externalKey)).length;

    const statements = chunk.flatMap((row) => {
      const routeId = `route-${row.routeSlug}`;
      return [
        db.prepare(`INSERT INTO routes (id, origin_name, destination_name, active, created_at)
          VALUES (?1, ?2, ?3, 1, ?4)
          ON CONFLICT(id) DO UPDATE SET origin_name=excluded.origin_name, destination_name=excluded.destination_name, active=1`)
          .bind(routeId, row.originName, row.destinationName, Date.now()),
        db.prepare(`INSERT INTO services
          (id, external_key, source, active, route_id, operator_name, service_name, departure_time, arrival_time, seat_type, base_price, sleep_score, on_time_rate, booking_url, updated_at)
          VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15)
          ON CONFLICT(external_key) DO UPDATE SET
            source=excluded.source, active=excluded.active, route_id=excluded.route_id,
            operator_name=excluded.operator_name, service_name=excluded.service_name,
            departure_time=excluded.departure_time, arrival_time=excluded.arrival_time,
            seat_type=excluded.seat_type, base_price=excluded.base_price,
            sleep_score=excluded.sleep_score, on_time_rate=excluded.on_time_rate,
            booking_url=excluded.booking_url, updated_at=excluded.updated_at`)
          .bind(`service-import-${crypto.randomUUID()}`, row.externalKey, row.source, row.active, routeId, row.operatorName, row.serviceName, row.departureTime, row.arrivalTime, row.seatType, row.basePrice, row.sleepScore, row.onTimeRate, row.bookingUrl, Date.now()),
      ];
    });
    await db.batch(statements);
  }

  await logRun(sourceKey, fileName, body.rows.length, inserted, updated, errors, user.email);
  return Response.json({ ok: errors.length === 0, inserted, updated, errors });
}

async function logRun(sourceKey: string, fileName: string | null, total: number, inserted: number, updated: number, errors: { row: number; message: string }[], email: string | undefined) {
  const db = getD1();
  const status = errors.length === total ? "failed" : errors.length ? "partial" : "success";
  const now = Date.now();
  await db.batch([
    db.prepare(`INSERT INTO import_runs (id, source_key, file_name, status, total_rows, inserted_rows, updated_rows, error_rows, error_summary, imported_by, created_at)
      VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)`)
      .bind(crypto.randomUUID(), sourceKey, fileName, status, total, inserted, updated, errors.length, JSON.stringify(errors.slice(0, 20)), email || null, now),
    db.prepare("UPDATE feed_sources SET last_imported_at = ?1 WHERE source_key = ?2").bind(now, sourceKey),
  ]);
}

function validate(row: ImportRow): ValidRow | string {
  const externalKey = asString(row.externalKey, 120);
  const source = asString(row.source, 50) || "csv";
  const originName = asString(row.originName, 40);
  const destinationName = asString(row.destinationName, 40);
  const routeSlug = slug(asString(row.routeSlug, 60));
  const operatorName = asString(row.operatorName, 80);
  const serviceName = asString(row.serviceName, 100);
  const departureTime = time(asString(row.departureTime, 5));
  const arrivalTime = time(asString(row.arrivalTime, 5));
  const basePrice = boundedInteger(row.basePrice, 1, 200000);
  if (!externalKey || !originName || !destinationName || !routeSlug || !operatorName || !serviceName || !departureTime || !arrivalTime || basePrice === null) {
    return "必須項目または時刻・運賃の形式が正しくありません";
  }
  const sleepScore = optionalNumber(row.sleepScore, 0, 100);
  const onTimePercent = optionalNumber(row.onTimeRate, 0, 100);
  if (sleepScore === false || onTimePercent === false) return "快眠スコア・定時率は0〜100で入力してください";
  const bookingUrl = safeUrl(asString(row.bookingUrl, 500));
  if (row.bookingUrl && !bookingUrl) return "予約URLはhttps://で入力してください";
  return {
    externalKey, source, originName, destinationName, routeSlug, operatorName, serviceName,
    departureTime, arrivalTime, seatType: asString(row.seatType, 40) || null, basePrice,
    sleepScore: sleepScore === null ? null : Math.round(sleepScore),
    onTimeRate: onTimePercent === null ? null : onTimePercent / 100,
    bookingUrl,
    active: ["0", "false", "停止"].includes(String(row.active).toLowerCase()) ? 0 : 1,
  };
}

function slug(value: string) { return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""); }
function time(value: string) { return /^([01]\d|2[0-3]):[0-5]\d$/.test(value) ? value : ""; }
function boundedInteger(value: unknown, min: number, max: number) { const number = Number(value); return Number.isInteger(number) && number >= min && number <= max ? number : null; }
function optionalNumber(value: unknown, min: number, max: number): number | null | false {
  if (value === "" || value === null || value === undefined) return null;
  const number = Number(value);
  return Number.isFinite(number) && number >= min && number <= max ? number : false;
}
function safeUrl(value: string) { if (!value) return null; try { const url = new URL(value); return url.protocol === "https:" ? url.toString() : null; } catch { return null; } }
