import { getChatGPTUser } from "../../../chatgpt-auth";
import { isNoluAdmin } from "../../../admin-auth";
import { asString, getD1, jsonError } from "../../../../db/d1";

export async function POST(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return jsonError("Sign in is required", 401);
  if (!isNoluAdmin(user)) return jsonError("Administrator access is required", 403);
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  if (!body) return jsonError("Invalid JSON", 400);
  const name = asString(body.name, 80);
  const sourceKey = key(asString(body.sourceKey, 50));
  const feedType = ["csv", "api", "sftp"].includes(String(body.feedType)) ? String(body.feedType) : "csv";
  const schedule = ["manual", "hourly", "daily"].includes(String(body.schedule)) ? String(body.schedule) : "manual";
  const endpointUrl = safeUrl(asString(body.endpointUrl, 500));
  const secretEnvName = envName(asString(body.secretEnvName, 80));
  if (!name || !sourceKey) return jsonError("提供元名とsourceKeyは必須です", 422);
  if (body.endpointUrl && !endpointUrl) return jsonError("接続先URLはhttps://で入力してください", 422);
  if (body.secretEnvName && !secretEnvName) return jsonError("シークレット名は半角英大文字・数字・_で入力してください", 422);
  try {
    const id = crypto.randomUUID();
    await getD1().prepare(`INSERT INTO feed_sources (id, name, source_key, feed_type, endpoint_url, schedule, secret_env_name, enabled, created_at)
      VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, 1, ?8)`).bind(id, name, sourceKey, feedType, endpointUrl, schedule, secretEnvName || null, Date.now()).run();
    return Response.json({ ok: true, id }, { status: 201 });
  } catch {
    return jsonError("同じsourceKeyが登録済みです", 409);
  }
}

function key(value: string) { return value.toLowerCase().replace(/[^a-z0-9_-]+/g, "-").replace(/^-|-$/g, ""); }
function envName(value: string) { return /^[A-Z][A-Z0-9_]*$/.test(value) ? value : ""; }
function safeUrl(value: string) { if (!value) return null; try { const url = new URL(value); return url.protocol === "https:" ? url.toString() : null; } catch { return null; } }
