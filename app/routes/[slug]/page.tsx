import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getD1 } from "../../../db/d1";
import { siteUrl } from "../../../lib/site";
import { OUTBOUND_URL_SQL, outboundLabel } from "../../../lib/outbound";

export const dynamic = "force-dynamic";
type Params = Promise<{ slug: string }>;
type RouteRecord = { id: string; originName: string; destinationName: string; createdAt: number };
type ServiceRow = { id: string; operatorName: string; serviceName: string; departureTime: string; arrivalTime: string; seatType: string | null; basePrice: number; sleepScore: number | null; onTimeRate: number | null; reviewScore: number | null; reviewCount: number; salesStatus: string; availableSeats: number | null; updatedAt: number; bookingUrl: string | null; outboundUrl: string | null };
type ReviewStats = { reviewCount: number; rating: number | null; sleep: number | null; punctuality: number | null; comfort: number | null };
type HistoryRow = { day: string; minPrice: number; avgPrice: number; maxPrice: number; changes: number };

async function getRoute(slug: string) {
  return getD1().prepare(`SELECT id, origin_name AS originName, destination_name AS destinationName, created_at AS createdAt FROM routes WHERE id = ?1 AND active = 1`)
    .bind(`route-${slug}`).first<RouteRecord>();
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const route = await getRoute(slug);
  if (!route) return {};
  return {
    title: `${route.originName}から${route.destinationName}の高速バス・夜行バス比較`,
    description: `${route.originName}発${route.destinationName}行き高速バスの料金相場、最安値、残席、快眠スコア、定時率、口コミを比較。到着後の乗り換えも確認できます。`,
    alternates: { canonical: `/routes/${slug}` },
  };
}

export default async function RouteDetailPage({ params }: { params: Params }) {
  const { slug } = await params;
  const route = await getRoute(slug);
  if (!route) notFound();
  const db = getD1();
  const [serviceResult, reviewStats, historyResult, relatedResult] = await Promise.all([
    db.prepare(`
      SELECT s.id, s.operator_name AS operatorName, s.service_name AS serviceName,
        s.departure_time AS departureTime, s.arrival_time AS arrivalTime,
        s.seat_type AS seatType, s.base_price AS basePrice, s.sleep_score AS sleepScore,
        s.on_time_rate AS onTimeRate, s.sales_status AS salesStatus,
        s.available_seats AS availableSeats, s.updated_at AS updatedAt,
        s.booking_url AS bookingUrl, ${OUTBOUND_URL_SQL} AS outboundUrl,
        ROUND(AVG(rv.rating), 1) AS reviewScore, COUNT(rv.id) AS reviewCount
      FROM services s LEFT JOIN reviews rv ON rv.service_id = s.id AND rv.status = 'published'
      WHERE s.route_id = ?1 AND s.active = 1
      GROUP BY s.id ORDER BY s.base_price ASC
    `).bind(route.id).all<ServiceRow>(),
    db.prepare(`
      SELECT COUNT(rv.id) AS reviewCount, ROUND(AVG(rv.rating), 1) AS rating,
        ROUND(AVG(rv.sleep_rating), 1) AS sleep,
        ROUND(AVG(rv.punctuality_rating), 1) AS punctuality,
        ROUND(AVG(rv.comfort_rating), 1) AS comfort
      FROM reviews rv JOIN services s ON s.id = rv.service_id
      WHERE s.route_id = ?1 AND rv.status = 'published'
    `).bind(route.id).first<ReviewStats>(),
    db.prepare(`
      SELECT date(captured_at / 1000, 'unixepoch') AS day,
        MIN(base_price) AS minPrice, ROUND(AVG(base_price)) AS avgPrice,
        MAX(base_price) AS maxPrice, COUNT(*) AS changes
      FROM service_snapshots
      WHERE route_id = ?1 AND captured_at >= ?2
      GROUP BY day ORDER BY day DESC LIMIT 14
    `).bind(route.id, Date.now() - 90 * 24 * 60 * 60 * 1000).all<HistoryRow>(),
    db.prepare(`
      SELECT r.id, r.origin_name AS originName, r.destination_name AS destinationName,
        MIN(s.base_price) AS minPrice, COUNT(s.id) AS serviceCount
      FROM routes r JOIN services s ON s.route_id = r.id AND s.active = 1
      WHERE r.active = 1 AND r.id <> ?1 AND (r.origin_name = ?2 OR r.destination_name = ?3)
      GROUP BY r.id ORDER BY serviceCount DESC LIMIT 6
    `).bind(route.id, route.originName, route.destinationName).all<{ id: string; originName: string; destinationName: string; minPrice: number; serviceCount: number }>(),
  ]);
  const rows = serviceResult.results || [];
  const prices = rows.map((row) => Number(row.basePrice)).filter(Number.isFinite);
  const minPrice = prices.length ? Math.min(...prices) : 0;
  const maxPrice = prices.length ? Math.max(...prices) : 0;
  const avgPrice = prices.length ? Math.round(prices.reduce((sum, price) => sum + price, 0) / prices.length) : 0;
  const bestSleep = Math.max(0, ...rows.map((row) => Number(row.sleepScore) || 0));
  const onSale = rows.filter((row) => row.salesStatus === "on_sale").length;
  const soldOut = rows.filter((row) => row.salesStatus === "sold_out").length;
  const updatedAt = Math.max(Number(route.createdAt), ...rows.map((row) => Number(row.updatedAt) || 0));
  const bands = priceBands(prices);
  const reviewSummary = makeReviewSummary(reviewStats);
  const faqs = buildFaqs(route, minPrice, maxPrice);
  const canonical = siteUrl(`/routes/${slug}`);
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      { "@type": "WebPage", name: `${route.originName}から${route.destinationName}の高速バス比較`, url: canonical, dateModified: new Date(updatedAt).toISOString(), about: { "@type": "BusTrip", departureBusStop: { "@type": "BusStop", name: route.originName }, arrivalBusStop: { "@type": "BusStop", name: route.destinationName } } },
      { "@type": "Dataset", name: `${route.originName}〜${route.destinationName} 高速バス料金・運行データ`, description: `${rows.length}便の料金、快眠スコア、定時率、販売状況を集計`, url: canonical, dateModified: new Date(updatedAt).toISOString(), variableMeasured: ["最低運賃", "平均運賃", "最高運賃", "快眠スコア", "定時率", "残席状況"] },
      { "@type": "BreadcrumbList", itemListElement: [
        { "@type": "ListItem", position: 1, name: "ホーム", item: siteUrl() },
        { "@type": "ListItem", position: 2, name: "全国の路線", item: siteUrl("/routes") },
        { "@type": "ListItem", position: 3, name: `${route.originName}から${route.destinationName}` },
      ] },
      { "@type": "FAQPage", mainEntity: faqs.map((item) => ({ "@type": "Question", name: item.q, acceptedAnswer: { "@type": "Answer", text: item.a } })) },
    ],
  };

  return <main className="route-page">
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
    <header className="results-nav"><a className="brand" href="/"><span>N</span>NOLU <small>by BUSSELECT</small></a><a href="/routes">全国の路線</a></header>
    <section className="route-hero"><div className="route-shell">
      <nav><a href="/">ホーム</a> / <a href="/routes">高速バス路線</a> / {route.originName} → {route.destinationName}</nav>
      <span className="kicker">ROUTE DATA GUIDE</span><h1>{route.originName}から{route.destinationName}の<br />高速バス・夜行バス比較</h1>
      <p>料金相場、移動品質、口コミ、最新の販売状況をデータで比較できます。</p>
      <div className="route-facts"><div><small>掲載便</small><b>{rows.length}便</b></div><div><small>最安値</small><b>{minPrice ? `¥${minPrice.toLocaleString()}〜` : "集計中"}</b></div><div><small>最高快眠スコア</small><b>{bestSleep || "—"}/100</b></div><div><small>データ更新</small><b>{new Date(updatedAt).toLocaleDateString("ja-JP")}</b></div></div>
    </div></section>
    <section className="route-shell route-content">
      <section className="route-data-summary"><header><span className="kicker">NOLU ORIGINAL DATA</span><h2>この路線の料金相場と販売状況</h2><p>{rows.length}便の最新データを集計。予約報酬の有無は順位に影響しません。</p></header>
        <div className="route-metrics"><article><small>最低運賃</small><strong>¥{minPrice.toLocaleString()}</strong></article><article><small>平均運賃</small><strong>¥{avgPrice.toLocaleString()}</strong></article><article><small>最高運賃</small><strong>¥{maxPrice.toLocaleString()}</strong></article><article><small>販売状況</small><strong>{onSale}便</strong><span>販売中・満席{soldOut}便</span></article></div>
        <div className="price-bands"><h3>価格帯別の便数</h3>{bands.map((band) => <div key={band.label}><span>{band.label}</span><i><em style={{ width: `${rows.length ? Math.max(4, band.count / rows.length * 100) : 0}%` }} /></i><b>{band.count}便</b></div>)}</div>
      </section>

      <div className="route-table"><div className="route-table-head"><span>便・運行会社</span><span>発着時刻</span><span>移動品質</span><span>運賃・空席</span></div>{rows.map((row) => <div key={row.id}><span><small>{row.operatorName}</small><b>{row.serviceName}</b><em>{row.seatType || "座席情報確認中"}</em></span><span><b>{row.departureTime} → {row.arrivalTime}</b></span><span><b>快眠 {row.sleepScore ?? "—"}</b><small>定時率 {row.onTimeRate == null ? "—" : `${Math.round(row.onTimeRate * 100)}%`}・★{row.reviewScore ?? "—"}（{row.reviewCount}件）</small></span><span><strong>¥{Number(row.basePrice).toLocaleString()}</strong><small>{availability(row)}</small>{outboundLabel(row.bookingUrl, row.outboundUrl, row.salesStatus === "sold_out") ? <a href={`/go/${row.id}?source=route-page`}>{outboundLabel(row.bookingUrl, row.outboundUrl, row.salesStatus === "sold_out")}</a> : <span className="cta-pending">連携準備中</span>}</span></div>)}</div>

      <section className="route-insights"><article><span className="kicker">REVIEW INSIGHT</span><h2>口コミから見る移動品質</h2><p>{reviewSummary}</p><dl><div><dt>総合</dt><dd>{formatScore(reviewStats?.rating)}</dd></div><div><dt>睡眠</dt><dd>{formatScore(reviewStats?.sleep)}</dd></div><div><dt>定時性</dt><dd>{formatScore(reviewStats?.punctuality)}</dd></div><div><dt>快適性</dt><dd>{formatScore(reviewStats?.comfort)}</dd></div></dl><small>公開済み口コミ {reviewStats?.reviewCount || 0}件を集計。件数が少ない場合は参考値です。</small></article>
        <article><span className="kicker">PRICE HISTORY</span><h2>直近90日の料金更新</h2>{historyResult.results.length ? <div className="history-mini">{historyResult.results.slice(0, 7).map((item) => <div key={item.day}><time>{item.day}</time><span>最安 ¥{Number(item.minPrice).toLocaleString()}</span><b>平均 ¥{Number(item.avgPrice).toLocaleString()}</b><small>{item.changes}件更新</small></div>)}</div> : <p>料金履歴を蓄積中です。API・CSVの更新時に価格変化を記録します。</p>}</article>
      </section>

      <aside className="method-box"><span className="kicker">OUR METHODOLOGY</span><h2>集計方法と情報の透明性</h2><p>料金統計は現在販売対象の掲載便から算出し、口コミは公開済み投稿のみを集計します。価格・残席・販売状態は事業者APIまたは管理データの更新時に記録します。広告・予約報酬は比較順位へ影響させません。</p></aside>
      <section className="faq"><h2>よくある質問</h2>{faqs.map((item) => <details key={item.q}><summary>{item.q}</summary><p>{item.a}</p></details>)}</section>
      {!!relatedResult.results.length && <section className="related-routes"><header><span className="kicker">RELATED ROUTES</span><h2>関連する高速バス路線</h2></header><div>{relatedResult.results.map((item) => <a key={item.id} href={`/routes/${item.id.replace(/^route-/, "")}`}><span>{item.originName} → {item.destinationName}</span><b>¥{Number(item.minPrice).toLocaleString()}〜</b><small>{item.serviceCount}便 →</small></a>)}</div></section>}
      <footer className="route-cta"><div><h2>条件に合う便を比較する</h2><p>料金、快眠度、出発時刻を一覧で確認できます。</p></div><a href={`/search?from=${encodeURIComponent(route.originName)}&to=${encodeURIComponent(route.destinationName)}`}>検索結果を見る →</a></footer>
    </section>
  </main>;
}

function availability(row: ServiceRow) {
  if (row.salesStatus === "sold_out") return "満席";
  if (row.availableSeats != null) return `残り${row.availableSeats}席`;
  return row.salesStatus === "on_sale" ? "販売中" : "販売状況を確認";
}
function formatScore(value: number | null | undefined) { return value == null ? "—" : `${Number(value).toFixed(1)} / 5`; }
function makeReviewSummary(stats: ReviewStats | null) {
  if (!stats?.reviewCount) return "口コミデータを募集中です。乗車後の睡眠のしやすさ、定時性、快適性を投稿できます。";
  const values = [{ label: "睡眠のしやすさ", value: stats.sleep }, { label: "定時性", value: stats.punctuality }, { label: "車内の快適性", value: stats.comfort }].filter((item) => item.value != null).sort((a, b) => Number(b.value) - Number(a.value));
  if (!values.length) return `公開済み口コミ${stats.reviewCount}件の総合評価は${formatScore(stats.rating)}です。`;
  return `公開済み口コミ${stats.reviewCount}件では「${values[0].label}」の評価が最も高く、${formatScore(values[0].value)}です。総合評価は${formatScore(stats.rating)}です。`;
}
function priceBands(prices: number[]) {
  if (!prices.length) return [];
  const min = Math.min(...prices), max = Math.max(...prices), width = Math.max(1000, Math.ceil((max - min + 1) / 4 / 500) * 500);
  return Array.from({ length: 4 }, (_, index) => {
    const start = min + width * index, end = index === 3 ? Infinity : start + width;
    return { label: end === Infinity ? `¥${start.toLocaleString()}以上` : `¥${start.toLocaleString()}〜${(end - 1).toLocaleString()}`, count: prices.filter((price) => price >= start && price < end).length };
  }).filter((band) => band.count);
}
function buildFaqs(route: RouteRecord, min: number, max: number) {
  const range = min ? `現在の掲載便では${min.toLocaleString()}円から${max.toLocaleString()}円です。` : "料金データを更新中です。";
  return [
    { q: `${route.originName}から${route.destinationName}の高速バス料金はいくらですか？`, a: `${range}日程、座席タイプ、予約時期により変動するため、検索結果で最新料金を確認してください。` },
    { q: "夜行バスで眠りやすい座席は？", a: "隣席との間隔が広い3列独立席やシェル型座席が有力です。快眠スコアと実際の乗車口コミも比較してください。" },
    { q: "到着後の電車や地下鉄も調べられますか？", a: "はい。到着停留所から最終目的地までの所要時間、運賃、乗り換え回数を比較できます。" },
    { q: "掲載順位に広告は影響しますか？", a: "予約報酬の有無はランキング順位へ反映しません。料金、移動品質、定時性、口コミなどの比較指標を分けて表示します。" },
  ];
}
