import { requireChatGPTUser } from "../chatgpt-auth";
import { isNoluAdmin } from "../admin-auth";
import { getD1 } from "../../db/d1";

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  const user = await requireChatGPTUser("/admin");
  if (!isNoluAdmin(user)) return <main className="admin-page"><section><h1>アクセスできません</h1><p>この画面はNOLU運営者専用です。</p></section></main>;
  const [summary, topServices, destinations] = await Promise.all([
    getD1().prepare(`SELECT (SELECT COUNT(*) FROM outbound_clicks) AS clicks, (SELECT COUNT(*) FROM reviews WHERE status = 'published') AS publishedReviews, (SELECT COUNT(*) FROM reviews WHERE status = 'pending') AS pendingReviews, (SELECT COUNT(*) FROM onward_searches) AS onwardSearches`).first<Record<string, number>>(),
    getD1().prepare(`SELECT s.service_name AS serviceName, COUNT(c.id) AS clicks FROM services s LEFT JOIN outbound_clicks c ON c.service_id = s.id GROUP BY s.id ORDER BY clicks DESC LIMIT 5`).all(),
    getD1().prepare(`SELECT final_destination AS destination, COUNT(*) AS searches FROM onward_searches GROUP BY final_destination ORDER BY searches DESC LIMIT 5`).all(),
  ]);
  return (
    <main className="admin-page">
      <header><a className="brand" href="/"><span>N</span>NOLU</a><div><small>運営者</small><b>{user.displayName}</b></div></header>
      <section><span className="kicker">BUSSELECT CONTROL</span><h1>運営ダッシュボード</h1><nav className="admin-tabs"><a href="/admin/services">便データ管理</a><a href="/admin/reviews">レビュー審査</a></nav>
        <div className="metric-grid">
          <article><small>予約送客クリック</small><strong>{summary?.clicks || 0}</strong></article>
          <article><small>公開レビュー</small><strong>{summary?.publishedReviews || 0}</strong></article>
          <article><small>審査待ち</small><strong>{summary?.pendingReviews || 0}</strong><a href="/admin/reviews">審査する →</a></article>
          <article><small>到着後検索</small><strong>{summary?.onwardSearches || 0}</strong></article>
        </div>
        <div className="admin-panels">
          <article><h2>送客された便</h2>{topServices.results.map((item) => <div key={String(item.serviceName)}><span>{String(item.serviceName)}</span><b>{String(item.clicks)} click</b></div>)}</article>
          <article><h2>到着後の人気目的地</h2>{destinations.results.length ? destinations.results.map((item) => <div key={String(item.destination)}><span>{String(item.destination)}</span><b>{String(item.searches)} searches</b></div>) : <p>検索データが蓄積されると表示されます。</p>}</article>
        </div>
      </section>
    </main>
  );
}
