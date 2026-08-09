import type { Metadata } from "next";
import { BusFinder } from "./bus-finder";
import { getD1 } from "../db/d1";
import { siteUrl } from "../lib/site";
import { todayInJst } from "../lib/jst";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "NOLU | 高速バスを、価格だけで選ばない。",
  description:
    "料金・快眠度・定時性・設備・口コミを一度に比較。あなたに合う夜行バス・高速バスを見つける移動品質ナビ。",
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "NOLU",
  description: "高速バス・夜行バスの移動品質比較ナビ",
  potentialAction: {
    "@type": "SearchAction",
    target: siteUrl("/search?from={from}&to={to}"),
    "query-input": ["required name=from", "required name=to"],
  },
};

export default async function Home() {
  const db = getD1();
  const [serviceCountResult, highwayCountResult, reviewCountResult, originCountResult, featuredServiceResult, featuredHighwayResult] =
    await Promise.all([
      db.prepare(`SELECT COUNT(*) AS count FROM services WHERE active = 1`).first<{ count: number }>(),
      db.prepare(`SELECT COUNT(*) AS count FROM highway_catalog`).first<{ count: number }>(),
      db.prepare(`SELECT COUNT(*) AS count FROM reviews WHERE status = 'published'`).first<{ count: number }>(),
      db.prepare(`
        SELECT COUNT(DISTINCT origin) AS count FROM (
          SELECT origin_name AS origin FROM routes WHERE active = 1
          UNION
          SELECT origin_name AS origin FROM highway_catalog
        )
      `).first<{ count: number }>(),
      db.prepare(`
        SELECT s.id, s.operator_name AS operatorName, s.service_name AS serviceName, s.departure_time AS departureTime,
          s.arrival_time AS arrivalTime, s.seat_type AS seatType, s.base_price AS basePrice, s.sleep_score AS sleepScore,
          s.on_time_rate AS onTimeRate, r.origin_name AS originName, r.destination_name AS destinationName,
          ROUND(AVG(rv.rating), 1) AS reviewScore, COUNT(rv.id) AS reviewCount
        FROM services s JOIN routes r ON r.id = s.route_id LEFT JOIN reviews rv ON rv.service_id = s.id AND rv.status = 'published'
        WHERE s.active = 1 AND r.active = 1 GROUP BY s.id ORDER BY s.sleep_score DESC LIMIT 6
      `).all(),
      db.prepare(`
        SELECT id, operator_name AS operatorName, service_name AS serviceName, origin_name AS originName,
          destination_name AS destinationName, departure_time AS departureTime, arrival_time AS arrivalTime,
          official_url AS officialUrl, license_name AS licenseName
        FROM highway_catalog ORDER BY updated_at DESC LIMIT 6
      `).all(),
    ]);

  const stats = {
    serviceCount: (serviceCountResult?.count || 0) + (highwayCountResult?.count || 0),
    reviewCount: reviewCountResult?.count || 0,
    originCount: originCountResult?.count || 0,
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <BusFinder
        stats={stats}
        today={todayInJst()}
        featuredServices={(featuredServiceResult.results || []) as never[]}
        featuredHighway={(featuredHighwayResult.results || []) as never[]}
      />
    </>
  );
}
