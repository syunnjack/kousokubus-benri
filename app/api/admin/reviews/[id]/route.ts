import { getChatGPTUser } from "../../../../chatgpt-auth";
import { getD1, jsonError } from "../../../../../db/d1";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getChatGPTUser();
  if (!user) return jsonError("Sign in is required", 401);
  const { id } = await context.params;
  const body = await request.json().catch(() => null) as { status?: string } | null;
  if (!body || !["published", "rejected"].includes(body.status || "")) {
    return jsonError("status must be published or rejected", 422);
  }

  const result = await getD1()
    .prepare("UPDATE reviews SET status = ?1 WHERE id = ?2 AND status = 'pending'")
    .bind(body.status, id)
    .run();
  if (!result.meta.changes) return jsonError("Pending review not found", 404);
  return Response.json({ ok: true, id, status: body.status });
}
