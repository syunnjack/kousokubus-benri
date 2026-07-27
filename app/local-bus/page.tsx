import type { Metadata } from "next";
import { getD1 } from "../../db/d1";
import { LocalBusSearch } from "./local-bus-search";
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "路線バス時刻表・停留所検索", description: "全国の路線バス・コミュニティバスを停留所名や路線名から検索。公式GTFS-JPオープンデータに基づく時刻表を確認できます。", alternates: { canonical: "/local-bus" } };
export default async function LocalBusPage() {
  const stats = await getD1().prepare(`SELECT (SELECT COUNT(*) FROM bus_agencies) AS agencies, (SELECT COUNT(*) FROM bus_stops) AS stops, (SELECT COUNT(*) FROM bus_lines) AS lines, (SELECT COUNT(*) FROM bus_trips) AS trips`).first<Record<string, number>>();
  return <main className="local-bus-page"><header className="results-nav"><a className="brand" href="/"><span>N</span>NOLU</a><a href="/routes">高速バス</a></header><section className="local-bus-hero"><div><nav><a href="/">ホーム</a> / 路線バス</nav><span className="kicker">LOCAL BUS / GTFS-JP</span><h1>路線バスの停留所と<br />時刻表を探す</h1><p>自治体・バス事業者が公開する公式GTFS-JPオープンデータを、出典とライセンス付きで掲載します。</p><dl><div><dt>事業者</dt><dd>{stats?.agencies || 0}</dd></div><div><dt>停留所</dt><dd>{Number(stats?.stops || 0).toLocaleString()}</dd></div><div><dt>路線</dt><dd>{Number(stats?.lines || 0).toLocaleString()}</dd></div><div><dt>便</dt><dd>{Number(stats?.trips || 0).toLocaleString()}</dd></div></dl></div></section><div className="directory-shell"><LocalBusSearch /><aside className="data-source-note"><h2>データについて</h2><p>国土交通省が普及を進めるGTFS-JP形式のオープンデータを利用します。各ページに提供者・ライセンスを表示し、更新データは差分取込します。実際の運行状況は事業者の公式案内も確認してください。</p></aside></div></main>;
}
