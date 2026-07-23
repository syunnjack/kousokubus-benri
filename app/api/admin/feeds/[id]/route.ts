import { getChatGPTUser } from "../../../../chatgpt-auth";
import { isNoluAdmin } from "../../../../admin-auth";
import { getD1, jsonError } from "../../../../../db/d1";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getChatGPTUser();
  if (!user) return jsonError("Sign in is required", 401);
  if (!isNoluAdmin(user)) return jsonError("Administrator access is required", 403);
  const body = await request.json().catch(() => null) as { enabled?: unknown } | null;
  if (typeof body?.enabled !== "boolean") return jsonError("enabled is required", 422);
  const { id } = await context.params;
  const result = await getD1().prepare("UPDATE feed_sources SET enabled = ?1 WHERE id = ?2").bind(body.enabled ? 1 : 0, id).run();
  if (!result.meta.changes) return jsonError("Not found", 404);
  return Response.json({ ok: true });
}
