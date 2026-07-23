import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getD1 } from "../../../db/d1";

export const dynamic = "force-dynamic";
type Params = Promise<{ slug: string }>;

async function getRoute(slug: string) {
  return getD1().prepare(`
    SELECT id, origin_name AS originName, destination_name AS destinationName,
      created_at AS createdAt
    FROM routes WHERE id = ?1 AND active = 1
  `).bind(`route-${slug}`).first<Record<string, string | number>>();
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const route = await getRoute((await params).slug);
  if (!route) return {};
  const title = `${route.originName}から${route.destinationName}の高速バス・夜行バス比較`;
  return {
    title,
    description: `${route.originName}発${route.destinationName}行き高速バスを、料金・快眠度・定時率・設備・乗車レビューで比較。降車後の乗換も案内します。`,
    alternates: { canonical: `/routes/${(await params).slug}` },
  };
}

export default async function RouteDetailPage({ params }: { params: Params }) {
  const { slug } = await params;
  const route = await getRoute(slug);
  if (!route) notFound();
  const services = await getD1().prepare(`
    SELECT s.id, s.operator_name AS operatorName, s.service_name AS serviceName,
      s.departure_time AS departureTime, s.arrival_time AS arrivalTime,
      s.seat_type AS seatType, s.base_price AS basePrice,
      s.sleep_score AS sleepScore, s.on_time_rate AS onTimeRate,
      ROUND(AVG(rv.rating), 1) AS reviewScore, COUNT(rv.id) AS reviewCount
    FROM services s
    LEFT JOIN reviews rv ON rv.service_id = s.id AND rv.status = 'published'
    WHERE s.route_id = ?1 GROUP BY s.id ORDER BY s.base_price ASC
  `).bind(String(route.id)).all();
  const rows = services.results as Record<string, unknown>[];
  const minPrice = Math.min(...rows.map((row) => Number(row.basePrice)));
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      { "@type": "WebPage", name: `${route.originName}から${route.destinationName}の高速バス比較`, dateModified: new Date().toISOString().slice(0, 10), about: { "@type": "BusTrip", departureBusStop: { "@type": "BusStop", name: route.originName }, arrivalBusStop: { "@type": "BusStop", name: route.destinationName } } },
      { "@type": "FAQPage", mainEntity: faqs(route.originName, route.destinationName).map((item) => ({ "@type": "Question", name: item.q, acceptedAnswer: { "@type": "Answer", text: item.a } })) },
    ],
  };

  return (
    <main className="route-page">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <header className="results-nav"><a className="brand" href="/"><span>N</span>NOLU <small>by BUSSELECT</small></a><a href={`/search?from=${route.originName}&to=${route.destinationName}`}>便を検索</a></header>
      <section className="route-hero"><div className="route-shell"><nav><a href="/">ホーム</a> / 高速バス路線 / {String(route.originName)}→{String(route.destinationName)}</nav><span className="kicker">ROUTE GUIDE</span><h1>{String(route.originName)}から{String(route.destinationName)}の<br />高速バス・夜行バス比較</h1><p>最安値だけでなく、眠りやすさ・定時性・乗車レビューから便を選べます。</p><div className="route-facts"><div><small>掲載便</small><b>{rows.length}便</b></div><div><small>最安値</small><b>¥{minPrice.toLocaleString()}〜</b></div><div><small>最高快眠スコア</small><b>{Math.max(...rows.map((row) => Number(row.sleepScore)))}/100</b></div><div><small>情報更新</small><b>{new Date().toLocaleDateString("ja-JP")}</b></div></div></div></section>
      <section className="route-shell route-content">
        <article className="route-lead"><h2>{String(route.originName)}→{String(route.destinationName)}便の選び方</h2><p>料金を優先するなら4列シート、翌朝の予定を重視するなら独立3列またはシェル型が候補です。BUSSELECTでは、座席仕様だけでなく実際の乗車レビューと定時率を組み合わせて比較します。</p></article>
        <div className="route-table"><div className="route-table-head"><span>便・運行会社</span><span>発着</span><span>移動品質</span><span>料金</span></div>{rows.map((row) => <div key={String(row.id)}><span><small>{String(row.operatorName)}</small><b>{String(row.serviceName)}</b><em>{String(row.seatType)}</em></span><span><b>{String(row.departureTime)} → {String(row.arrivalTime)}</b></span><span><b>快眠 {String(row.sleepScore)}</b><small>定時 {Math.round(Number(row.onTimeRate) * 100)}%・★ {String(row.reviewScore || "—")}</small></span><span><strong>¥{Number(row.basePrice).toLocaleString()}</strong><a href={`/go/${String(row.id)}?source=route-page`}>予約情報</a></span></div>)}</div>
        <aside className="method-box"><span className="kicker">OUR METHODOLOGY</span><h2>比較順位の考え方</h2><p>レビュー評価、快眠スコア、定時率、料金を分けて表示します。予約成立による報酬の有無は、ランキング順位に反映しません。掲載情報は事業者・提携データと利用者投稿を区別し、更新日を明示します。</p></aside>
        <section className="faq"><h2>よくある質問</h2>{faqs(route.originName, route.destinationName).map((item) => <details key={item.q}><summary>{item.q}</summary><p>{item.a}</p></details>)}</section>
        <footer className="route-cta"><div><h2>条件に合う便を比較する</h2><p>料金、快眠度、出発時刻を一度に確認できます。</p></div><a href={`/search?from=${route.originName}&to=${route.destinationName}`}>検索結果を見る →</a></footer>
      </section>
    </main>
  );
}

function faqs(from: unknown, to: unknown) {
  return [
    { q: `${from}から${to}の高速バス料金はいくらですか？`, a: "日程、座席タイプ、予約時期により変動します。掲載便では3,900円から8,900円が目安です。検索結果で最新の料金をご確認ください。" },
    { q: "夜行バスで眠りやすい座席は？", a: "隣席との間隔が広い独立3列やシェル型が有力です。遮光カーテン、レッグレスト、首元の支えも確認してください。" },
    { q: "到着後の電車や地下鉄も調べられますか？", a: "はい。降車地から最終目的地までの所要時間、運賃、乗換回数、徒歩時間を比較できます。" },
    { q: "ランキングに広告は影響しますか？", a: "予約成立時に報酬を受け取る場合がありますが、報酬の有無はランキング順位に反映しません。" },
  ];
}
