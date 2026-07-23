import { env } from "cloudflare:workers";
import { getD1, jsonError } from "../../../../../db/d1";

export async function POST(request: Request) {
  const secret = (env as unknown as Record<string, unknown>).NOLU_CRON_SECRET;
  if (typeof secret !== "string" || secret.length < 32 || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return jsonError("Unauthorized", 401);
  }
  const now = Date.now();
  const hourlyCutoff = now - 55 * 60 * 1000;
  const dailyCutoff = now - 23 * 60 * 60 * 1000;
  const due = await getD1().prepare(`SELECT id, name, schedule FROM feed_sources
    WHERE enabled = 1 AND feed_type = 'api' AND endpoint_url IS NOT NULL
      AND ((schedule = 'hourly' AND (last_imported_at IS NULL OR last_imported_at < ?1))
        OR (schedule = 'daily' AND (last_imported_at IS NULL OR last_imported_at < ?2)))
    ORDER BY COALESCE(last_imported_at, 0) ASC LIMIT 10`).bind(hourlyCutoff, dailyCutoff).all<{ id: string; name: string; schedule: string }>();
  const results: { id: string; name: string; ok: boolean; status: number }[] = [];
  for (const feed of due.results || []) {
    const response = await fetch(new URL(`/api/admin/feeds/${feed.id}/sync`, request.url), {
      method: "POST",
      headers: { authorization: `Bearer ${secret}`, "user-agent": "NOLU-Scheduler/1.0" },
    });
    results.push({ id: feed.id, name: feed.name, ok: response.ok, status: response.status });
  }
  return Response.json({ ok: results.every((result) => result.ok), checkedAt: new Date(now).toISOString(), due: results.length, results });
}
