import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getD1 } from "../../../db/d1";

export const dynamic = "force-dynamic";
type Params = Promise<{ city: string }>;
type RouteRow = { id: string; originName: string; destinationName: string; serviceCount: number; minPrice: number; minDeparture: string; maxSleep: number };

async function getRoutes(city: string) {
  return getD1().prepare(`
    SELECT r.id, r.origin_name AS originName, r.destination_name AS destinationName,
      COUNT(s.id) AS serviceCount, MIN(s.base_price) AS minPrice,
      MIN(s.departure_time) AS minDeparture, MAX(s.sleep_score) AS maxSleep
    FROM routes r JOIN services s ON s.route_id = r.id AND s.active = 1
    WHERE r.active = 1 AND (r.origin_name = ?1 OR r.destination_name = ?1)
    GROUP BY r.id ORDER BY r.origin_name = ?1 DESC, r.destination_name
  `).bind(city).all<RouteRow>();
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const city = clean((await params).city);
  return {
    title: `${city}発着の高速バス・夜行バス路線`,
    description: `${city}発着の高速バス・夜行バスを一覧で比較。最安運賃、出発時刻、快眠スコア、口コミを確認して予約できます。`,
    alternates: { canonical: `/areas/${encodeURIComponent(city)}` },
  };
}

export default async function AreaPage({ params }: { params: Params }) {
  const city = clean((await params).city);
  const result = await getRoutes(city);
  const routes = result.results || [];
  if (!routes.length) notFound();
  const outbound = routes.filter((route) => route.originName === city);
  const inbound = routes.filter((route) => route.destinationName === city);
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      { "@type": "CollectionPage", name: `${city}発着の高速バス・夜行バス`, url: `https://busselect.jp/areas/${encodeURIComponent(city)}` },
      { "@type": "BreadcrumbList", itemListElement: [
        { "@type": "ListItem", position: 1, name: "ホーム", item: "https://busselect.jp" },
        { "@type": "ListItem", position: 2, name: "路線一覧", item: "https://busselect.jp/routes" },
        { "@type": "ListItem", position: 3, name: city },
      ] },
    ],
  };
  return <main className="directory-page">
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
    <header className="results-nav"><a className="brand" href="/"><span>N</span>NOLU</a><a href="/routes">全国の路線</a></header>
    <section className="area-hero"><div className="directory-shell"><nav><a href="/">ホーム</a> / <a href="/routes">路線一覧</a> / {city}</nav><span className="kicker">AREA GUIDE</span><h1>{city}発着の高速バス・<br />夜行バス</h1><p>{city}から行ける路線と、{city}へ到着する路線をまとめて比較できます。</p><form action="/search"><input type="hidden" name="from" value={city} /><input name="to" aria-label="到着地" placeholder="到着地を入力" /><button>便を検索</button></form></div></section>
    <section className="directory-shell area-content">
      <RouteSection title={`${city}発の路線`} routes={outbound} />
      <RouteSection title={`${city}着の路線`} routes={inbound} />
      <aside className="method-box"><span className="kicker">HOW TO CHOOSE</span><h2>{city}発着便の選び方</h2><p>価格だけでなく、到着時刻から最終目的地への移動、座席タイプ、快眠スコア、定時率も確認しましょう。早朝到着の場合は電車・地下鉄の始発時刻との接続も重要です。</p></aside>
    </section>
  </main>;
}

function RouteSection({ title, routes }: { title: string; routes: RouteRow[] }) {
  if (!routes.length) return null;
  return <section className="area-route-section"><header><h2>{title}</h2><span>{routes.length}路線</span></header><div>{routes.map((route) => {
    const other = route.originName === title.replace(/発の路線$/, "") ? route.destinationName : route.originName;
    return <a key={route.id} href={`/routes/${route.id.replace(/^route-/, "")}`}><div><small>{route.originName} → {route.destinationName}</small><h3>{other}</h3><p>始発 {route.minDeparture}・最大快眠スコア {route.maxSleep || "—"}</p></div><div><small>{route.serviceCount}便</small><strong>¥{Number(route.minPrice).toLocaleString()}〜</strong><span>詳しく見る →</span></div></a>;
  })}</div></section>;
}
function clean(value: string) { return decodeURIComponent(value).trim().slice(0, 40); }
