import { getChatGPTUser } from "../../../../chatgpt-auth";
import { isNoluAdmin } from "../../../../admin-auth";
import { asString, getD1, jsonError } from "../../../../../db/d1";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getChatGPTUser();
  if (!user) return jsonError("Sign in is required", 401);
  if (!isNoluAdmin(user)) return jsonError("Administrator access is required", 403);
  const { id } = await context.params;
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  if (!body) return jsonError("Invalid JSON", 400);
  const price = Number(body.basePrice);
  const sleep = Number(body.sleepScore);
  const rate = Number(body.onTimeRate);
  const bookingUrl = safeUrl(asString(body.bookingUrl, 500));
  if (!Number.isInteger(price) || price < 1 || !Number.isInteger(sleep) || sleep < 0 || sleep > 100 || !Number.isFinite(rate) || rate < 0 || rate > 100) {
    return jsonError("Invalid metrics", 422);
  }
  const result = await getD1().prepare(`UPDATE services SET base_price = ?1, sleep_score = ?2, on_time_rate = ?3, booking_url = ?4, updated_at = ?5 WHERE id = ?6`).bind(price, sleep, rate / 100, bookingUrl, Date.now(), id).run();
  if (!result.meta.changes) return jsonError("Service not found", 404);
  return Response.json({ ok: true, id });
}

function safeUrl(value: string) { if (!value) return null; try { const url = new URL(value); return url.protocol === "https:" ? url.toString() : null; } catch { return null; } }
