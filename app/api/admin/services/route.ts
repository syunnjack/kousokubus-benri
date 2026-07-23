import { getChatGPTUser } from "../../../chatgpt-auth";
import { isNoluAdmin } from "../../../admin-auth";
import { asString, getD1, jsonError } from "../../../../db/d1";

export async function POST(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return jsonError("Sign in is required", 401);
  if (!isNoluAdmin(user)) return jsonError("Administrator access is required", 403);
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  if (!body) return jsonError("Invalid JSON", 400);

  const originName = asString(body.originName, 40);
  const destinationName = asString(body.destinationName, 40);
  const routeSlug = slug(asString(body.routeSlug, 60));
  const operatorName = asString(body.operatorName, 80);
  const serviceName = asString(body.serviceName, 100);
  const departureTime = time(asString(body.departureTime, 5));
  const arrivalTime = time(asString(body.arrivalTime, 5));
  const seatType = asString(body.seatType, 40);
  const basePrice = integer(body.basePrice, 1, 200000);
  const sleepScore = integer(body.sleepScore, 0, 100);
  const onTimeRate = Number(body.onTimeRate);
  const bookingUrl = safeUrl(asString(body.bookingUrl, 500));
  if (!originName || !destinationName || !routeSlug || !operatorName || !serviceName || !departureTime || !arrivalTime || !basePrice) {
    return jsonError("Required fields are missing", 422);
  }
  if (!Number.isFinite(onTimeRate) || onTimeRate < 0 || onTimeRate > 100) return jsonError("onTimeRate must be 0-100", 422);

  const db = getD1();
  const routeId = `route-${routeSlug}`;
  const serviceId = `service-${routeSlug}-${crypto.randomUUID().slice(0, 8)}`;
  await db.batch([
    db.prepare(`INSERT OR IGNORE INTO routes (id, origin_name, destination_name, active, created_at) VALUES (?1, ?2, ?3, 1, ?4)`).bind(routeId, originName, destinationName, Date.now()),
    db.prepare(`INSERT INTO services (id, route_id, operator_name, service_name, departure_time, arrival_time, seat_type, base_price, sleep_score, on_time_rate, booking_url, updated_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12)`).bind(serviceId, routeId, operatorName, serviceName, departureTime, arrivalTime, seatType || null, basePrice, sleepScore, onTimeRate / 100, bookingUrl, Date.now()),
  ]);
  return Response.json({ ok: true, serviceId, routeId }, { status: 201 });
}

function slug(value: string) { return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""); }
function time(value: string) { return /^([01]\d|2[0-3]):[0-5]\d$/.test(value) ? value : ""; }
function integer(value: unknown, min: number, max: number) { const number = Number(value); return Number.isInteger(number) && number >= min && number <= max ? number : 0; }
function safeUrl(value: string) { if (!value) return null; try { const url = new URL(value); return url.protocol === "https:" ? url.toString() : null; } catch { return null; } }
