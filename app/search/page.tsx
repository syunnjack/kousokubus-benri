import type { Metadata } from "next";
import { getD1 } from "../../db/d1";

export const dynamic = "force-dynamic";
type SearchParams = Promise<{ from?: string; to?: string; date?: string; sort?: string; booking?: string }>;

export async function generateMetadata({ searchParams }: { searchParams: SearchParams }): Promise<Metadata> {
  const query = await searchParams, from = clean(query.from, "東京"), to = clean(query.to, "大阪");
  return { title: `${from}発 ${to}行き 高速バス比較`, description: `${from}から${to}への高速バスと、到着後の路線バス・鉄道・地下鉄・徒歩・タクシーをまとめて案内します。` };
}

export default async function SearchPage({ searchParams }: { searchParams: SearchParams }) {
  const query = await searchParams, from = clean(query.from, "東京"), to = clean(query.to, "大阪");
  const sort = ["price", "sleep", "overall"].includes(query.sort || "") ? query.sort : "overall";
  const order = sort === "price" ? "s.base_price ASC" : sort === "sleep" ? "s.sleep_score DESC" : "(COALESCE(s.sleep_score, 0) * 0.55 + COALESCE(s.on_time_rate, 0) * 45) DESC";
  const db = getD1(), likeFrom = `%${from}%`, likeTo = `%${to}%`;
  const [serviceResult, catalogResult, stopResult, alternativeResult] = await Promise.all([
    db.prepare(`SELECT s.id, s.operator_name AS operatorName, s.service_name AS serviceName, s.departure_time AS departureTime,
      s.arrival_time AS arrivalTime, s.seat_type AS seatType, s.base_price AS basePrice, s.sleep_score AS sleepScore,
      s.on_time_rate AS onTimeRate, s.booking_url AS bookingUrl, s.sales_status AS salesStatus, s.available_seats AS availableSeats,
      ROUND(AVG(rv.rating), 1) AS reviewScore, COUNT(rv.id) AS reviewCount
      FROM services s JOIN routes r ON r.id=s.route_id LEFT JOIN reviews rv ON rv.service_id=s.id AND rv.status='published'
      WHERE r.origin_name=?1 AND r.destination_name=?2 AND r.active=1 AND s.active=1 GROUP BY s.id ORDER BY ${order}`).bind(from, to).all(),
    db.prepare(`SELECT id, operator_name AS operatorName, service_name AS serviceName, origin_name AS originName,
      destination_name AS destinationName, departure_time AS departureTime, arrival_time AS arrivalTime,
      official_url AS officialUrl, license_name AS licenseName FROM highway_catalog
      WHERE origin_name LIKE ?1 AND destination_name LIKE ?2 ORDER BY departure_time LIMIT 80`).bind(likeFrom, likeTo).all(),
    db.prepare(`SELECT s.id, s.name, a.name AS agencyName, COUNT(DISTINCT st.trip_id) AS tripCount
      FROM bus_stops s JOIN bus_agencies a ON a.id=s.agency_id LEFT JOIN bus_stop_times st ON st.stop_id=s.id
      WHERE s.name LIKE ?1 GROUP BY s.id ORDER BY tripCount DESC LIMIT 8`).bind(likeTo).all(),
    db.prepare(`SELECT r.origin_name AS originName, r.destination_name AS destinationName, MIN(s.base_price) AS minPrice, COUNT(s.id) AS serviceCount
      FROM routes r JOIN services s ON s.route_id=r.id AND s.active=1
      WHERE (r.origin_name=?1 OR r.destination_name=?2) AND NOT (r.origin_name=?1 AND r.destination_name=?2)
      GROUP BY r.id ORDER BY serviceCount DESC LIMIT 8`).bind(from, to).all(),
  ]);
  const buses=serviceResult.results as Record<string,unknown>[], catalog=catalogResult.results as Record<string,unknown>[];
  const total=buses.length+catalog.length;
  return <main className="results-page">
    <header className="results-nav"><a className="brand" href="/"><span>N</span>NOLU</a><a href="/local-bus">路線バス時刻表</a></header>
    <section className="results-shell">
      <form className="results-search"><label>出発地<input name="from" defaultValue={from}/></label><span>→</span><label>到着地<input name="to" defaultValue={to}/></label><label>乗車日<input name="date" type="date" defaultValue={query.date||"2026-08-08"}/></label><button>再検索</button></form>
      {query.booking==="unavailable"&&<p className="result-notice">この便は予約連携の準備中です。公式案内または別便を確認してください。</p>}
      <div className="results-heading"><div><span className="kicker">SEARCH RESULTS</span><h1>{from} → {to}</h1><p>{total}件・公式ダイヤ候補を含む</p></div><nav>{[["overall","おすすめ"],["sleep","快眠"],["price","安い"]].map(([value,label])=><a className={sort===value?"active":""} key={value} href={`/search?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&date=${query.date||""}&sort=${value}`}>{label}</a>)}</nav></div>
      <div className="results-list">
        {buses.map((bus,index)=><article key={String(bus.id)}><div className="result-rank">{index+1}</div><div className="result-main"><small>{String(bus.operatorName)}</small><h2>{String(bus.serviceName)}</h2><div className="result-time"><b>{String(bus.departureTime)}</b><span>{from} ── {to}</span><b>{String(bus.arrivalTime)}</b></div><div className="result-tags"><span>{String(bus.seatType||"座席情報確認中")}</span><span>快眠 {String(bus.sleepScore??"—")}</span><span>口コミ {String(bus.reviewScore||"—")}（{String(bus.reviewCount)}件）</span></div></div><div className="result-price"><small>{bus.salesStatus==="sold_out"?"満席":bus.availableSeats!=null?`残り${bus.availableSeats}席`:"価格・空席確認"}</small><strong>¥{Number(bus.basePrice).toLocaleString()}</strong><a href={`/go/${bus.id}?source=search`}>{bus.bookingUrl?"予約サイトへ":"公式連携準備中"}</a></div></article>)}
        {catalog.map((bus,index)=><article className="official-schedule" key={String(bus.id)}><div className="result-rank">{buses.length+index+1}</div><div className="result-main"><small>{String(bus.operatorName)}・公式GTFS</small><h2>{String(bus.serviceName)}</h2><div className="result-time"><b>{String(bus.departureTime||"—")}</b><span>{String(bus.originName)} ── {String(bus.destinationName)}</span><b>{String(bus.arrivalTime||"—")}</b></div><div className="result-tags"><span>公式ダイヤ</span><span>{String(bus.licenseName||"出典確認済み")}</span></div></div><div className="result-price"><small>運賃・運行日を公式確認</small><a href={String(bus.officialUrl)} target="_blank" rel="noreferrer">公式案内へ →</a></div></article>)}
        {!total&&<div className="no-results"><h2>完全一致する便はまだありません</h2><p>近い路線、到着地の停留所、公式高速バス案内を表示しています。検索を行き止まりにしません。</p><a href="https://www.bus.or.jp/timetable/express_bus/" target="_blank" rel="noreferrer">日本バス協会の公式時刻表 →</a></div>}
      </div>
      <section className="arrival-connect"><header><span className="kicker">AFTER ARRIVAL</span><h2>{to}到着後の乗り換え</h2><p>路線バス・電車・地下鉄・徒歩・タクシーを比較して、最終目的地まで案内します。</p></header><div className="mode-chips"><span>路線バス</span><span>電車</span><span>地下鉄</span><span>徒歩</span><span>タクシー</span></div><div className="arrival-stop-grid">{stopResult.results.map((stop)=><a key={String(stop.id)} href={`/local-bus/stops/${encodeURIComponent(String(stop.id))}`}><b>{String(stop.name)}</b><small>{String(stop.agencyName)}・{String(stop.tripCount)}便</small><span>時刻表 →</span></a>)}</div><a className="onward-cta" href={`/?arrival=${encodeURIComponent(to)}#onward`}>最終目的地までのルートを検索 →</a></section>
      {!!alternativeResult.results.length&&<section className="alternative-routes"><h2>近い条件の高速バス</h2>{alternativeResult.results.map((route)=><a key={`${route.originName}-${route.destinationName}`} href={`/search?from=${encodeURIComponent(String(route.originName))}&to=${encodeURIComponent(String(route.destinationName))}`}><span>{String(route.originName)} → {String(route.destinationName)}</span><b>¥{Number(route.minPrice).toLocaleString()}〜</b><small>{String(route.serviceCount)}便</small></a>)}</section>}
    </section>
  </main>;
}

function clean(value:string|undefined,fallback:string){return(value||fallback).trim().slice(0,40);}
