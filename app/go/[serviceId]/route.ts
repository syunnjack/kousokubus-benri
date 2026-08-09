import { getChatGPTUser } from "../../chatgpt-auth";
import { getD1 } from "../../../db/d1";
import { OUTBOUND_URL_SQL } from "../../../lib/outbound";

export async function GET(request: Request, context: { params: Promise<{ serviceId: string }> }) {
  const { serviceId } = await context.params;
  const url = new URL(request.url);
  const service = await getD1()
    .prepare(`
      SELECT s.booking_url AS bookingUrl, ${OUTBOUND_URL_SQL} AS outboundUrl,
        r.origin_name AS originName, r.destination_name AS destinationName
      FROM services s JOIN routes r ON r.id = s.route_id
      WHERE s.id = ?1 AND s.active = 1
    `)
    .bind(serviceId)
    .first<{ bookingUrl: string | null; outboundUrl: string | null; originName: string; destinationName: string }>();
  if (!service) return new Response("Not found", { status: 404 });

  // 送客先が無い便は、元の路線の検索結果へ戻す（従来は東京→大阪へ固定で飛んでいた）。
  if (!service.outboundUrl) {
    const back = new URL("/search", request.url);
    back.searchParams.set("from", service.originName);
    back.searchParams.set("to", service.destinationName);
    back.searchParams.set("booking", "unavailable");
    return Response.redirect(back, 302);
  }

  let destination: URL;
  try {
    destination = new URL(service.outboundUrl);
  } catch {
    return new Response("Invalid outbound URL", { status: 500 });
  }
  if (!["https:", "http:"].includes(destination.protocol)) return new Response("Invalid outbound URL", { status: 500 });

  const user = await getChatGPTUser();
  await getD1().prepare(`
    INSERT INTO outbound_clicks (id, service_id, visitor_email, source, created_at)
    VALUES (?1, ?2, ?3, ?4, ?5)
  `).bind(
    crypto.randomUUID(),
    serviceId,
    user?.email || null,
    `${url.searchParams.get("source") || "search"}:${service.bookingUrl ? "booking" : "official"}`,
    Date.now(),
  ).run();

  return Response.redirect(destination, 302);
}
