import { asString, getD1, jsonError } from "../../../db/d1";
import { getChatGPTUser } from "../../chatgpt-auth";

export async function GET(request: Request) {
  const serviceId = new URL(request.url).searchParams.get("serviceId");
  if (!serviceId) return jsonError("serviceId is required", 400);

  const result = await getD1()
    .prepare(`
      SELECT id, service_id AS serviceId, display_name AS displayName,
        rating, sleep_rating AS sleepRating, punctuality_rating AS punctualityRating,
        comfort_rating AS comfortRating, body, ride_date AS rideDate,
        verified_ride AS verifiedRide, helpful_count AS helpfulCount,
        created_at AS createdAt
      FROM reviews
      WHERE service_id = ?1 AND status = 'published'
      ORDER BY verified_ride DESC, helpful_count DESC, created_at DESC
      LIMIT 50
    `)
    .bind(serviceId)
    .all();

  return Response.json({ ok: true, reviews: result.results });
}

export async function POST(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return jsonError("Sign in is required", 401);
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  if (!body) return jsonError("Invalid JSON", 400);

  const serviceId = asString(body.serviceId, 80);
  const visitorId = user.email;
  const displayName = asString(body.displayName, 40) || user.displayName;
  const reviewBody = asString(body.body, 1200);
  const rating = Number(body.rating);
  if (!serviceId || !visitorId || !displayName || reviewBody.length < 20) {
    return jsonError("Required fields are missing or the review is too short", 422);
  }
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return jsonError("rating must be an integer from 1 to 5", 422);
  }

  const id = crypto.randomUUID();
  await getD1()
    .prepare(`
      INSERT INTO reviews (
        id, service_id, visitor_id, display_name, rating,
        sleep_rating, punctuality_rating, comfort_rating,
        body, ride_date, verified_ride, helpful_count, status, created_at
      ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, 0, 0, 'pending', ?11)
    `)
    .bind(
      id, serviceId, visitorId, displayName, rating,
      optionalScore(body.sleepRating), optionalScore(body.punctualityRating),
      optionalScore(body.comfortRating), reviewBody, asString(body.rideDate, 10) || null,
      Date.now(),
    )
    .run();

  return Response.json(
    { ok: true, id, status: "pending", message: "レビューを受け付けました。確認後に公開されます。" },
    { status: 201 },
  );
}

function optionalScore(value: unknown) {
  const score = Number(value);
  return Number.isInteger(score) && score >= 1 && score <= 5 ? score : null;
}
