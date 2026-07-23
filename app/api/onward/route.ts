import { asString, getD1, jsonError } from "../../../db/d1";
import { fetchNavitimeRoute } from "../../../lib/transit-provider";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  if (!body) return jsonError("Invalid JSON", 400);
  const arrivalStop = asString(body.arrivalStop, 100);
  const finalDestination = asString(body.finalDestination, 120);
  const preference = ["fast", "cheap", "low_walk"].includes(String(body.preference)) ? String(body.preference) : "fast";
  if (!arrivalStop || !finalDestination) return jsonError("arrivalStop and finalDestination are required", 422);

  let provider = "demo";
  let providerItems: unknown[] = [];
  const startNodeId = asString(body.startNodeId, 40);
  const goalNodeId = asString(body.goalNodeId, 40);
  if (startNodeId && goalNodeId) {
    const live = await fetchNavitimeRoute({ startNodeId, goalNodeId, startTime: asString(body.startTime, 30) || new Date().toISOString().slice(0, 19) });
    if (live.configured) { provider = "navitime"; providerItems = live.items; }
  }
  const demo = preference === "cheap"
    ? { durationMinutes: 47, fare: 190, transferCount: 1, walkMinutes: 12 }
    : preference === "low_walk"
      ? { durationMinutes: 42, fare: 420, transferCount: 0, walkMinutes: 3 }
      : { durationMinutes: 36, fare: 420, transferCount: 1, walkMinutes: 8 };

  await getD1().prepare(`
    INSERT INTO onward_searches (id, arrival_stop, final_destination, preference, duration_minutes, fare, transfer_count, created_at)
    VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)
  `).bind(crypto.randomUUID(), arrivalStop, finalDestination, preference, demo.durationMinutes, demo.fare, demo.transferCount, Date.now()).run();
  return Response.json({ ok: true, provider, route: demo, providerItems, note: provider === "demo" ? "交通API契約情報の設定後、自動的に実データへ切り替わります。" : null });
}
