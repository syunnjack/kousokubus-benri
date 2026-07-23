import { getChatGPTUser } from "../../chatgpt-auth";
import { getD1 } from "../../../db/d1";

export async function GET(request: Request, context: { params: Promise<{ serviceId: string }> }) {
  const { serviceId } = await context.params;
  const url = new URL(request.url);
  const service = await getD1()
    .prepare("SELECT booking_url AS bookingUrl FROM services WHERE id = ?1")
    .bind(serviceId)
    .first<{ bookingUrl: string | null }>();
  if (!service) return new Response("Not found", { status: 404 });

  const user = await getChatGPTUser();
  await getD1().prepare(`
    INSERT INTO outbound_clicks (id, service_id, visitor_email, source, created_at)
    VALUES (?1, ?2, ?3, ?4, ?5)
  `).bind(crypto.randomUUID(), serviceId, user?.email || null, url.searchParams.get("source") || "search", Date.now()).run();

  if (!service.bookingUrl) {
    return Response.redirect(new URL("/search?from=東京&to=大阪&booking=unavailable", request.url), 302);
  }
  const destination = new URL(service.bookingUrl);
  if (!["https:", "http:"].includes(destination.protocol)) return new Response("Invalid booking URL", { status: 500 });
  return Response.redirect(destination, 302);
}
