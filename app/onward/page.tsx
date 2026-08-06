import type { Metadata } from "next";
import { OnwardPlanner } from "./planner";

export const metadata: Metadata = {
  title: "高速バス到着後の乗換・ルート検索",
  description: "高速バス降車後の路線バス、電車、地下鉄、徒歩、タクシーをまとめて検索できます。",
  alternates: { canonical: "/onward" },
};

export default async function OnwardPage({ searchParams }: { searchParams: Promise<{ arrival?: string }> }) {
  const arrival = String((await searchParams).arrival || "").slice(0, 100);
  return <main className="onward-page">
    <header className="results-nav"><a className="brand" href="/"><span>N</span>NOLU</a><a href="/search">高速バス検索</a></header>
    <section className="onward-hero"><div className="directory-shell"><nav><a href="/">ホーム</a> / 到着後ルート</nav><span className="kicker">DOOR TO DESTINATION</span><h1>高速バスを降りてからも、<br/>迷わず目的地へ。</h1><p>路線バス・電車・地下鉄・徒歩・タクシーを、同じ条件から選べます。</p></div></section>
    <div className="directory-shell"><OnwardPlanner initialArrival={arrival}/></div>
  </main>;
}
