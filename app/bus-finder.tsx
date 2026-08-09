"use client";

import { useState } from "react";
import { ReviewHub } from "./review-hub";

type FeaturedService = {
  id: string;
  operatorName: string;
  serviceName: string;
  originName: string;
  destinationName: string;
  departureTime: string;
  arrivalTime: string;
  seatType: string | null;
  basePrice: number;
  sleepScore: number | null;
  onTimeRate: number | null;
  reviewScore: number | null;
  reviewCount: number;
};

type FeaturedHighway = {
  id: string;
  operatorName: string;
  serviceName: string;
  originName: string;
  destinationName: string;
  departureTime: string | null;
  arrivalTime: string | null;
  officialUrl: string;
  licenseName: string | null;
};

type Stats = { serviceCount: number; reviewCount: number; originCount: number };

const fallbackReviews = [
  { user: "mio_旅", route: "東京 → 大阪", score: "4.8", text: "首元の支えが想像以上。翌朝の予定を入れても大丈夫でした。", helpful: 128, badge: "乗車確認済み" },
];

export function BusFinder({
  stats,
  featuredServices,
  featuredHighway,
}: {
  stats: Stats;
  featuredServices: FeaturedService[];
  featuredHighway: FeaturedHighway[];
}) {
  const [from, setFrom] = useState("東京");
  const [to, setTo] = useState("大阪");
  const [saved, setSaved] = useState<string[]>([]);
  const [arrivalSpot, setArrivalSpot] = useState("");

  function goSearch(event?: { preventDefault: () => void }) {
    event?.preventDefault();
    window.location.href = `/search?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&date=2026-08-08`;
  }

  function googleMapsTransitUrl() {
    const origin = `${to}駅`;
    const destination = arrivalSpot.trim() || to;
    return `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}&travelmode=transit`;
  }

  return (
    <main>
      <header className="nav shell">
        <a className="brand" href="#" aria-label="NOLU ホーム"><span>N</span>NOLU <small>by BUSSELECT</small></a>
        <nav aria-label="メインナビゲーション">
          <a href="/local-bus">路線バス時刻表</a><a href="/routes">高速バス路線一覧</a><a href="#reviews">みんなの乗車記</a>
        </nav>
        <button className="ghost">♡ 保存した便 <b>{saved.length}</b></button>
      </header>

      <section className="hero">
        <div className="shell hero-inner">
          <div className="eyebrow">PRICE × COMFORT × REAL VOICES</div>
          <h1>高速バスを、<br /><em>価格だけで選ばない。</em></h1>
          <p>公式ダイヤと乗車レビューから、眠りやすさ・定時性・設備まで。<br />明日の予定から逆算する、新しいバス選び。</p>

          <form className="search-card" onSubmit={goSearch}>
            <div className="fields">
              <label><small>出発地</small><input value={from} onChange={e => setFrom(e.target.value)} aria-label="出発地" /></label>
              <button type="button" className="swap" onClick={() => { setFrom(to); setTo(from); }} aria-label="出発地と到着地を入れ替える">⇄</button>
              <label><small>到着地</small><input value={to} onChange={e => setTo(e.target.value)} aria-label="到着地" /></label>
              <label><small>乗車日</small><input type="date" defaultValue="2026-08-08" aria-label="乗車日" /></label>
              <label><small>人数</small><select aria-label="人数"><option>大人 1名</option><option>大人 2名</option></select></label>
              <button type="submit" className="search-btn">比較する <span>→</span></button>
            </div>
            <div className="quick"><span>人気:</span><button type="button" onClick={() => {setFrom("東京");setTo("大阪")}}>東京 → 大阪</button><button type="button" onClick={() => {setFrom("東京");setTo("名古屋")}}>東京 → 名古屋</button><button type="button" onClick={() => {setFrom("大阪");setTo("福岡")}}>大阪 → 福岡</button></div>
          </form>
          <div className="trust-row">
            <span>✓ 掲載データ {stats.serviceCount.toLocaleString()}件（公式ダイヤ含む）</span>
            <span>✓ 出発エリア {stats.originCount}件</span>
            <span>✓ 予約サイト横断</span>
          </div>
        </div>
      </section>

      <section className="shell comparison" id="ranking">
        <div className="section-head">
          <div><span className="kicker">今週の注目ルート</span><h2>実際に運行しているバスを比較</h2><p>掲載サービス・公式GTFSダイヤより</p></div>
        </div>
        <div className="bus-grid">
          {featuredServices.map((bus, index) => (
            <article className={`bus-card ${index === 0 ? "best" : ""}`} key={bus.id}>
              <div className="rank">{index + 1}</div>
              <div className="bus-top"><div><span className="company">{bus.operatorName}</span><h3>{bus.serviceName}</h3></div><button className={saved.includes(bus.id) ? "heart saved":"heart"} onClick={() => setSaved(s => s.includes(bus.id) ? s.filter(n => n !== bus.id) : [...s,bus.id])}>♥</button></div>
              <div className="route"><div><b>{bus.departureTime}</b><small>{bus.originName}</small></div><span><i />{bus.destinationName}<i /></span><div><b>{bus.arrivalTime}</b><small>{bus.destinationName}</small></div></div>
              <div className="quality"><div><small>NOLU快眠スコア</small><strong>{bus.sleepScore ?? "—"}<i>/100</i></strong></div><div className="stars">★ {bus.reviewScore ?? "—"}<small>（{bus.reviewCount}件）</small></div></div>
              {bus.seatType && <div className="tags"><span>{bus.seatType}</span></div>}
              <div className="bus-foot"><div><small>定時 {bus.onTimeRate != null ? `${Math.round(bus.onTimeRate * 100)}%` : "—"}</small><strong>¥{Number(bus.basePrice).toLocaleString()}<i>〜</i></strong></div><button onClick={goSearch}>空席・料金を見る</button></div>
              {index === 0 && <div className="choice">総合ベスト</div>}
            </article>
          ))}
        </div>
        {featuredHighway.length > 0 && (
          <div className="highway-list">
            <h3>公式GTFSダイヤ（各社公式時刻表より）</h3>
            {featuredHighway.map((bus) => (
              <a className="official-schedule-card" key={bus.id} href={bus.officialUrl} target="_blank" rel="noreferrer">
                <div><small>{bus.operatorName}・公式GTFS</small><b>{bus.serviceName}</b></div>
                <div>{bus.originName} → {bus.destinationName}</div>
                <div><span>{bus.departureTime || "—"} 発</span></div>
              </a>
            ))}
          </div>
        )}
        <p className="ad-note">※ 予約成立時に提携先から手数料を受け取る場合があります。表示順位への影響はありません。</p>
      </section>

      <section className="onward" id="onward">
        <div className="shell">
          <div className="section-head">
            <div><span className="kicker">AFTER ARRIVAL</span><h2>バスを降りてからも、迷わない。</h2><p>到着地から最終目的地までの経路を、Googleマップの乗換案内で確認できます。</p></div>
          </div>
          <div className="onward-panel">
            <div className="onward-search">
              <label><small>到着地</small><b>{to}</b></label>
              <span className="chevron">›</span>
              <label><small>最終目的地</small><input value={arrivalSpot} onChange={e => setArrivalSpot(e.target.value)} placeholder={to} aria-label="最終目的地" /><span>観光地・ホテル・住所を入力（未入力の場合は到着地までの経路）</span></label>
              <a href={googleMapsTransitUrl()} target="_blank" rel="noreferrer" className="onward-maps-button">Googleマップで経路を見る ↗</a>
            </div>
          </div>
        </div>
      </section>

      <section className="why">
        <div className="shell">
          <span className="kicker">WHY NOLU?</span><h2>“安かった”の、その先へ。</h2>
          <div className="feature-grid">
            <article><b>01</b><span>☾</span><h3>快眠スコア</h3><p>座席幅、リクライニング、遮光、揺れ、口コミを独自集計。翌朝のコンディションを予測します。</p></article>
            <article><b>02</b><span>◷</span><h3>到着後ナビ</h3><p>早朝営業の風呂・カフェ・荷物預かりを到着地別に案内。降りてから迷わせません。</p></article>
            <article><b>03</b><span>♧</span><h3>リアルな乗車記</h3><p>乗車確認済みレビューを優先表示。写真と座席番号付きで「実際どう？」がわかります。</p></article>
          </div>
        </div>
      </section>

      <ReviewHub fallbackReviews={fallbackReviews} />

      <section className="newsletter"><div className="shell"><div><span>✦</span><h2>次の旅を、もっと賢く。</h2><p>値下がり通知、快眠便の新着、週末旅のアイデアを月2回だけ。</p></div><form onSubmit={e => e.preventDefault()}><input type="email" placeholder="メールアドレス" aria-label="メールアドレス" required /><button>無料で受け取る</button></form></div></section>
      <footer className="shell footer"><a className="brand" href="#"><span>N</span>NOLU</a><p>高速バスの比較から、到着後まで。<br />移動を旅の“空白時間”にしない。</p><div><b>探す</b><a href="/routes">高速バス路線</a><a href="/local-bus">路線バス時刻表</a><a href="#ranking">ランキング</a></div><div><b>NOLUについて</b><a href="/routes">掲載データについて</a></div><small>© 2026 NOLU. All rights reserved.</small></footer>
    </main>
  );
}
