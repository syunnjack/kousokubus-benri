import type { Metadata } from "next";
import { getD1 } from "../../db/d1";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "全国の高速バス・夜行バス路線一覧",
  description: "全国の高速バス・夜行バス路線を出発地・到着地から探せます。運賃、所要時間、快眠スコア、定時率を比較して便を選べます。",
  alternates: { canonical: "/routes" },
};

type RouteRow = { id: string; originName: string; destinationName: string; serviceCount: number; minPrice: number; updatedAt: number };

export default async function RoutesIndexPage() {
  const result = await getD1().prepare(`
    SELECT r.id, r.origin_name AS originName, r.destination_name AS destinationName,
      COUNT(s.id) AS serviceCount, MIN(s.base_price) AS minPrice,
      MAX(s.updated_at) AS updatedAt
    FROM routes r JOIN services s ON s.route_id = r.id AND s.active = 1
    WHERE r.active = 1
    GROUP BY r.id ORDER BY r.origin_name, r.destination_name
  `).all<RouteRow>();
  const routes = result.results || [];
  const origins = [...new Set(routes.map((route) => route.originName))];
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "全国の高速バス・夜行バス路線",
    numberOfItems: routes.length,
    itemListElement: routes.map((route, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: `${route.originName}から${route.destinationName}`,
      url: `https://busselect.jp/routes/${route.id.replace(/^route-/, "")}`,
    })),
  };
  return <main className="directory-page">
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
    <header className="results-nav"><a className="brand" href="/"><span>N</span>NOLU <small>by BUSSELECT</small></a><a href="/search">便を検索</a></header>
    <section className="directory-hero"><div><nav><a href="/">ホーム</a> / 路線一覧</nav><span className="kicker">ROUTE DIRECTORY</span><h1>全国の高速バス・<br />夜行バス路線</h1><p>出発地から路線を選び、運賃だけでなく快眠性・定時性・口コミまで比較できます。</p><dl><div><dt>掲載路線</dt><dd>{routes.length}</dd></div><div><dt>出発エリア</dt><dd>{origins.length}</dd></div><div><dt>掲載便</dt><dd>{routes.reduce((sum, route) => sum + Number(route.serviceCount), 0)}</dd></div></dl></div></section>
    <section className="directory-shell">
      <div className="area-links"><h2>出発地から探す</h2>{origins.map((origin) => <a key={origin} href={`/areas/${encodeURIComponent(origin)}`}>{origin}<span>{routes.filter((route) => route.originName === origin).length}路線</span></a>)}</div>
      {origins.map((origin) => <section className="route-group" key={origin}><header><div><span className="kicker">FROM</span><h2>{origin}発</h2></div><a href={`/areas/${encodeURIComponent(origin)}`}>{origin}の全路線 →</a></header><div>{routes.filter((route) => route.originName === origin).map((route) => <a className="directory-card" key={route.id} href={`/routes/${route.id.replace(/^route-/, "")}`}><span><small>{route.originName}発</small><b>{route.destinationName}</b></span><span><small>{route.serviceCount}便掲載</small><strong>¥{Number(route.minPrice).toLocaleString()}〜</strong></span><i>→</i></a>)}</div></section>)}
      {!routes.length && <p className="admin-empty">路線データを準備しています。</p>}
    </section>
  </main>;
}
