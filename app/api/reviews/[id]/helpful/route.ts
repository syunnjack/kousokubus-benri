import { asString, getD1, jsonError } from "../../../../../db/d1";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id: reviewId } = await context.params;
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  const visitorId = asString(body?.visitorId, 100);
  if (!reviewId || !visitorId) return jsonError("review id and visitorId are required", 400);

  const db = getD1();
  const voteId = crypto.randomUUID();
  const inserted = await db
    .prepare(`
      INSERT OR IGNORE INTO review_votes (id, review_id, visitor_id, created_at)
      VALUES (?1, ?2, ?3, ?4)
    `)
    .bind(voteId, reviewId, visitorId, Date.now())
    .run();

  if (inserted.meta.changes > 0) {
    await db
      .prepare("UPDATE reviews SET helpful_count = helpful_count + 1 WHERE id = ?1")
      .bind(reviewId)
      .run();
  }

  const review = await db
    .prepare("SELECT helpful_count AS helpfulCount FROM reviews WHERE id = ?1")
    .bind(reviewId)
    .first();
  if (!review) return jsonError("Review not found", 404);

  return Response.json({ ok: true, added: inserted.meta.changes > 0, ...review });
}
