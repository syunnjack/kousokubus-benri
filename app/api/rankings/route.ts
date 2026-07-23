import { getD1 } from "../../../db/d1";

export async function GET() {
  const result = await getD1().prepare(`
    SELECT
      s.id, s.operator_name AS operatorName, s.service_name AS serviceName,
      s.base_price AS basePrice, s.sleep_score AS sleepScore,
      s.on_time_rate AS onTimeRate,
      r.origin_name AS originName, r.destination_name AS destinationName,
      ROUND(AVG(rv.rating), 2) AS reviewScore,
      COUNT(rv.id) AS reviewCount
    FROM services s
    JOIN routes r ON r.id = s.route_id
    LEFT JOIN reviews rv ON rv.service_id = s.id AND rv.status = 'published'
    WHERE r.active = 1
    GROUP BY s.id
    ORDER BY
      (COALESCE(AVG(rv.rating), 0) * 12 + COALESCE(s.sleep_score, 0) * 0.4
       + COALESCE(s.on_time_rate, 0) * 20) DESC
    LIMIT 20
  `).all();

  return Response.json({
    ok: true,
    methodology: "レビュー評価、快眠スコア、定時率を合成。予約報酬は順位に影響しません。",
    rankings: result.results,
  });
}
