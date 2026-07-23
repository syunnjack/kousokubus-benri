import type { Metadata } from "next";
import { getD1 } from "../../db/d1";

export const dynamic = "force-dynamic";
type SearchParams = Promise<{ from?: string; to?: string; date?: string; sort?: string; booking?: string }>;

export async function generateMetadata({ searchParams }: { searchParams: SearchParams }): Promise<Metadata> {
  const query = await searchParams;
  const from = clean(query.from, "東京");
  const to = clean(query.to, "大阪");
  return {
    title: `${from}発 ${to}行き 高速バス比較`,
    description: `${from}から${to}への高速バスを料金・快眠度・定時率・口コミで比較。到着後の乗換まで案内します。`,
  };
}

export default async function SearchPage({ searchParams }: { searchParams: SearchParams }) {
  const query = await searchParams;
  const from = clean(query.from, "東京");
  const to = clean(query.to, "大阪");
  const sort = ["price", "sleep", "overall"].includes(query.sort || "") ? query.sort : "overall";
  const order = sort === "price" ? "s.base_price ASC" : sort === "sleep" ? "s.sleep_score DESC" : "(s.sleep_score * 0.55 + s.on_time_rate * 45) DESC";
  const result = await getD1().prepare(`
    SELECT s.id, s.operator_name AS operatorName, s.service_name AS serviceName,
      s.departure_time AS departureTime, s.arrival_time AS arrivalTime,
      s.seat_type AS seatType, s.base_price AS basePrice,
      s.sleep_score AS sleepScore, s.on_time_rate AS onTimeRate,
      s.booking_url AS bookingUrl,
      ROUND(AVG(rv.rating), 1) AS reviewScore, COUNT(rv.id) AS reviewCount
    FROM services s
    JOIN routes r ON r.id = s.route_id
    LEFT JOIN reviews rv ON rv.service_id = s.id AND rv.status = 'published'
    WHERE r.origin_name = ?1 AND r.destination_name = ?2 AND r.active = 1
    GROUP BY s.id
    ORDER BY ${order}
  `).bind(from, to).all();

  const buses = result.results as Record<string, unknown>[];
  return (
    <main className="results-page">
      <header className="results-nav"><a className="brand" href="/"><span>N</span>NOLU</a><a href="/#reviews">乗車レビュー</a></header>
      <section className="results-shell">
        <form className="results-search">
          <label>出発地<input name="from" defaultValue={from} /></label><span>→</span>
          <label>到着地<input name="to" defaultValue={to} /></label>
          <label>乗車日<input name="date" type="date" defaultValue={query.date || "2026-08-08"} /></label>
          <button>再検索</button>
        </form>
        {query.booking === "unavailable" && <p className="result-notice">この便は現在予約連携の準備中です。比較情報は引き続きご覧いただけます。</p>}
        <div className="results-heading"><div><span className="kicker">SEARCH RESULTS</span><h1>{from} → {to}</h1><p>{buses.length}便・表示料金は大人1名の目安</p></div><nav>{[["overall","おすすめ"],["sleep","快眠"],["price","安い"]].map(([value,label]) => <a className={sort === value ? "active":""} key={value} href={`/search?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&date=${query.date || ""}&sort=${value}`}>{label}</a>)}</nav></div>
        <div className="results-list">
          {buses.map((bus, index) => <article key={String(bus.id)}>
            <div className="result-rank">{index + 1}</div>
            <div className="result-main"><small>{String(bus.operatorName)}</small><h2>{String(bus.serviceName)}</h2><div className="result-time"><b>{String(bus.departureTime)}</b><span>{from}　━━━━　{to}</span><b>{String(bus.arrivalTime)}</b></div><div className="result-tags"><span>{String(bus.seatType)}</span><span>快眠 {String(bus.sleepScore)}</span><span>定時 {Math.round(Number(bus.onTimeRate) * 100)}%</span><span>★ {String(bus.reviewScore || "—")}（{String(bus.reviewCount)}件）</span></div></div>
            <div className="result-price"><small>片道・税込</small><strong>¥{Number(bus.basePrice).toLocaleString()}</strong><a href={`/go/${String(bus.id)}?source=search`}>{bus.bookingUrl ? "予約サイトへ" : "予約連携準備中"}</a></div>
          </article>)}
          {!buses.length && <div className="no-results"><h2>条件に合う便がまだありません</h2><p>現在は東京→大阪のサンプル便を公開しています。データ提携後、全国の路線へ拡大します。</p></div>}
        </div>
      </section>
    </main>
  );
}

function clean(value: string | undefined, fallback: string) {
  return (value || fallback).trim().slice(0, 40);
}
