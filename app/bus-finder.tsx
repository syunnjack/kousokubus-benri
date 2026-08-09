"use client";

import { useEffect, useState } from "react";
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

const SAVED_STORAGE_KEY = "nolu.saved-services";

export function BusFinder({
  stats,
  today,
  featuredServices,
  featuredHighway,
}: {
  stats: Stats;
  today: string;
  featuredServices: FeaturedService[];
  featuredHighway: FeaturedHighway[];
}) {
  const [from, setFrom] = useState("東京");
  const [to, setTo] = useState("大阪");
  const [date, setDate] = useState(today);
  const [passengers, setPassengers] = useState("1");
  const [saved, setSaved] = useState<string[]>([]);
  const [savedLoaded, setSavedLoaded] = useState(false);

  // 保存した便はブラウザに残す。読み込み前に書き戻すと空配列で上書きしてしまうため、
  // savedLoaded が立つまで永続化しない。
  useEffect(() => {
    try {
      const raw = localStorage.getItem(SAVED_STORAGE_KEY);
      if (raw) setSaved(JSON.parse(raw) as string[]);
    } catch {
      // 破損データやプライベートモードは無視して空のまま進める
    }
    setSavedLoaded(true);
  }, []);

  useEffect(() => {
    if (!savedLoaded) return;
    try {
      localStorage.setItem(SAVED_STORAGE_KEY, JSON.stringify(saved));
    } catch {
      // 保存できなくても検索は続けられる
    }
  }, [saved, savedLoaded]);

  function searchUrl() {
    return `/search?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&date=${encodeURIComponent(date)}&passengers=${encodeURIComponent(passengers)}`;
  }

  function goSearch(event?: { preventDefault: () => void }) {
    event?.preventDefault();
    window.location.href = searchUrl();
  }

  const topService = featuredServices[0];

  return (
    <main>
      <header className="nav shell">
        <a className="brand" href="/" aria-label="NOLU ホーム"><span>N</span>NOLU <small>by BUSSELECT</small></a>
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
              <label><small>乗車日</small><input type="date" value={date} min={today} onChange={e => setDate(e.target.value)} aria-label="乗車日" /></label>
              <label><small>人数</small><select value={passengers} onChange={e => setPassengers(e.target.value)} aria-label="人数">{[1, 2, 3, 4].map(n => <option key={n} value={String(n)}>大人 {n}名</option>)}</select></label>
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
        {featuredServices.length > 0 ? (
          <div className="bus-grid">
            {featuredServices.map((bus, index) => (
              <article className={`bus-card ${index === 0 ? "best" : ""}`} key={bus.id}>
                <div className="rank">{index + 1}</div>
                <div className="bus-top"><div><span className="company">{bus.operatorName}</span><h3>{bus.serviceName}</h3></div><button className={saved.includes(bus.id) ? "heart saved":"heart"} aria-pressed={saved.includes(bus.id)} aria-label={`${bus.serviceName}を保存`} onClick={() => setSaved(s => s.includes(bus.id) ? s.filter(n => n !== bus.id) : [...s,bus.id])}>♥</button></div>
                <div className="route"><div><b>{bus.departureTime}</b><small>{bus.originName}</small></div><span><i />{bus.destinationName}<i /></span><div><b>{bus.arrivalTime}</b><small>{bus.destinationName}</small></div></div>
                <div className="quality"><div><small>NOLU快眠スコア</small><strong>{bus.sleepScore ?? "—"}<i>/100</i></strong></div><div className="stars">★ {bus.reviewScore ?? "—"}<small>（{bus.reviewCount}件）</small></div></div>
                {bus.seatType && <div className="tags"><span>{bus.seatType}</span></div>}
                <div className="bus-foot"><div><small>定時 {bus.onTimeRate != null ? `${Math.round(bus.onTimeRate * 100)}%` : "—"}</small><strong>¥{Number(bus.basePrice).toLocaleString()}<i>〜</i></strong></div><a href={`/search?from=${encodeURIComponent(bus.originName)}&to=${encodeURIComponent(bus.destinationName)}&date=${encodeURIComponent(date)}&passengers=${encodeURIComponent(passengers)}`}>空席・料金を見る</a></div>
                {index === 0 && <div className="choice">総合ベスト</div>}
              </article>
            ))}
          </div>
        ) : (
          <p className="admin-empty">比較対象の便を準備中です。公式ダイヤからの検索と路線一覧はご利用いただけます。</p>
        )}
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
        <p className="ad-note">※ 予約成立時に提携先から手数料を受け取る場合があります。表示順位への影響はありません。<a href="/about">掲載方針を見る</a></p>
      </section>

      <section className="onward" id="onward">
        <div className="shell onward-teaser">
          <div className="section-head">
            <div><span className="kicker">AFTER ARRIVAL</span><h2>バスを降りてからも、迷わない。</h2><p>{to}到着後の路線バス・電車・地下鉄・徒歩・タクシーをまとめて検索できます。</p></div>
          </div>
          <a className="onward-maps-button" href={`/onward?arrival=${encodeURIComponent(to)}`}>到着後のルートを検索する ↗</a>
        </div>
      </section>

      <section className="why">
        <div className="shell">
          <span className="kicker">WHY NOLU?</span><h2>“安かった”の、その先へ。</h2>
          <div className="feature-grid">
            <article><b>01</b><span>☾</span><h3>快眠スコア</h3><p>座席幅、リクライニング、遮光、揺れ、口コミを独自集計。翌朝のコンディションを予測します。</p></article>
            <article><b>02</b><span>◷</span><h3>到着後ナビ</h3><p>降車地から最終目的地までの路線バス・鉄道・徒歩・タクシーを比較。降りてから迷わせません。</p></article>
            <article><b>03</b><span>♧</span><h3>リアルな乗車記</h3><p>乗車確認済みレビューを優先表示。実際の座席タイプと乗車日つきで「実際どう？」がわかります。</p></article>
          </div>
        </div>
      </section>

      <ReviewHub
        serviceId={topService?.id}
        routeLabel={topService ? `${topService.originName} → ${topService.destinationName}` : undefined}
      />

      <section className="newsletter">
        <div className="shell">
          <div><span>✦</span><h2>次の旅を、もっと賢く。</h2><p>全国の路線一覧、公式ダイヤの路線バス時刻表、到着後のルート検索をそのまま使えます。</p></div>
          <div className="newsletter-actions">
            <a href="/routes">高速バス路線を見る</a>
            <a href="/local-bus">路線バス時刻表</a>
          </div>
        </div>
      </section>

      <footer className="shell footer">
        <a className="brand" href="/"><span>N</span>NOLU</a>
        <p>高速バスの比較から、到着後まで。<br />移動を旅の“空白時間”にしない。</p>
        <div><b>探す</b><a href="/routes">高速バス路線</a><a href="/local-bus">路線バス時刻表</a><a href="/onward">到着後のルート検索</a><a href="#ranking">ランキング</a></div>
        <div><b>NOLUについて</b><a href="/about">運営者情報・掲載方針</a><a href="/privacy">プライバシーポリシー</a><a href="/about#data">掲載データについて</a></div>
        <small>© 2026 NOLU. All rights reserved.</small>
      </footer>
    </main>
  );
}
