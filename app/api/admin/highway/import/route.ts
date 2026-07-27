import { env } from "cloudflare:workers";
import { getChatGPTUser } from "../../../../chatgpt-auth";
import { isNoluAdmin } from "../../../../admin-auth";
import { asString, getD1, jsonError } from "../../../../../db/d1";

type Row = Record<string, unknown>;

export async function POST(request: Request) {
  const user = await getChatGPTUser();
  const secret = (env as unknown as Record<string, unknown>).NOLU_CRON_SECRET;
  const automated = typeof secret === "string" && secret.length >= 32 && request.headers.get("authorization") === `Bearer ${secret}`;
  if (!automated && !user) return jsonError("Sign in is required", 401);
  if (user && !isNoluAdmin(user)) return jsonError("Administrator access is required", 403);
  const body = await request.json().catch(() => null) as { sourceKey?: unknown; rows?: Row[] } | null;
  const sourceKey = key(asString(body?.sourceKey, 60));
  if (!sourceKey || !Array.isArray(body?.rows) || !body.rows.length || body.rows.length > 250) return jsonError("sourceKey and 1-250 rows are required", 422);
  const now = Date.now();
  const statements = body.rows.map((row) => statement(sourceKey, row, now));
  const invalid = statements.findIndex((item) => typeof item === "string");
  if (invalid >= 0) return jsonError(`${invalid + 1}行目: ${statements[invalid]}`, 422);
  await getD1().batch(statements as D1PreparedStatement[]);
  return Response.json({ ok: true, imported: statements.length });
}

function statement(sourceKey: string, row: Row, now: number): D1PreparedStatement | string {
  const externalKey = asString(row.externalKey, 180);
  const operatorName = asString(row.operatorName, 120);
  const serviceName = asString(row.serviceName, 180);
  const originName = asString(row.originName, 120);
  const destinationName = asString(row.destinationName, 120);
  const officialUrl = safeUrl(row.officialUrl);
  if (!externalKey || !operatorName || !serviceName || !originName || !destinationName || !officialUrl) return "required field is missing";
  return getD1().prepare(`INSERT INTO highway_catalog
    (id, source_key, external_key, operator_name, service_name, origin_name, destination_name, departure_time, arrival_time, official_url, license_name, license_url, updated_at)
    VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13)
    ON CONFLICT(external_key) DO UPDATE SET operator_name=excluded.operator_name, service_name=excluded.service_name,
      origin_name=excluded.origin_name, destination_name=excluded.destination_name, departure_time=excluded.departure_time,
      arrival_time=excluded.arrival_time, official_url=excluded.official_url, license_name=excluded.license_name,
      license_url=excluded.license_url, updated_at=excluded.updated_at`)
    .bind(`${sourceKey}:${externalKey}`, sourceKey, `${sourceKey}:${externalKey}`, operatorName, serviceName, originName, destinationName,
      time(row.departureTime), time(row.arrivalTime), officialUrl, asString(row.licenseName, 80) || null, safeUrl(row.licenseUrl), now);
}

function key(value: string) { return value.toLowerCase().replace(/[^a-z0-9_-]+/g, "-").replace(/^-|-$/g, ""); }
function time(value: unknown) { const text = asString(value, 8); return /^\d{1,2}:[0-5]\d(?::[0-5]\d)?$/.test(text) ? text.slice(0, 5).padStart(5, "0") : null; }
function safeUrl(value: unknown) { const text = asString(value, 500); if (!text) return null; try { const url = new URL(text); return url.protocol === "https:" ? url.toString() : null; } catch { return null; } }
