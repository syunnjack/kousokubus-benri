"use client";

import { useMemo, useState } from "react";
import { ReviewHub } from "./review-hub";

const buses = [
  { name: "グランドリーム 7号", company: "JRバス", price: 6200, score: 4.6, sleep: 92, delay: "定時 89%", seats: "独立3列", tags: ["仕切りカーテン", "USB-C", "トイレ"], accent: "best" },
  { name: "WILLER ReBorn", company: "WILLER EXPRESS", price: 8900, score: 4.8, sleep: 97, delay: "定時 86%", seats: "シェル型", tags: ["高遮光", "レッグレスト", "女性人気"], accent: "sleep" },
  { name: "KBライナー 113便", company: "千葉みらい観光", price: 3900, score: 4.1, sleep: 71, delay: "定時 82%", seats: "4列ゆったり", tags: ["最安値", "Wi-Fi", "充電"], accent: "value" },
];

const reviews = [
  { user: "mio_旅", route: "東京 → 大阪", score: "4.8", text: "首元の支えが想像以上。翌朝の予定を入れても大丈夫でした。", helpful: 128, badge: "乗車確認済み" },
  { user: "週末トラベラー", route: "新宿 → 金沢", score: "4.5", text: "到着場所から朝風呂まで徒歩6分。ルート案内が地味に助かる。", helpful: 94, badge: "常連レビュアー" },
  { user: "nana", route: "名古屋 → 東京", score: "4.7", text: "女性エリアで安心。カーテンの遮光性まで比較できたのが決め手。", helpful: 77, badge: "乗車確認済み" },
];

export function BusFinder() {
  const [from, setFrom] = useState("東京");
  const [to, setTo] = useState("大阪");
  const [priority, setPriority] = useState("総合");
  const [searched, setSearched] = useState(false);
  const [saved, setSaved] = useState<string[]>([]);
  const [votes, setVotes] = useState<Record<number, number>>({});
  const [arrivalSpot, setArrivalSpot] = useState("ユニバーサル・スタジオ・ジャパン");
  const [routeMode, setRouteMode] = useState("早い");
  const [onwardMessage, setOnwardMessage] = useState("交通データ連携デモ");

  const ordered = useMemo(() => {
    if (priority === "快眠") return [...buses].sort((a, b) => b.sleep - a.sleep);
    if (priority === "安さ") return [...buses].sort((a, b) => a.price - b.price);
    return buses;
  }, [priority]);

  const swap = () => {
    setFrom(to);
    setTo(from);
  };

  async function searchOnward() {
    setOnwardMessage("検索中…");
    const preference = routeMode === "安い" ? "cheap" : routeMode === "歩かない" ? "low_walk" : "fast";
    const response = await fetch("/api/onward", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ arrivalStop: "大阪駅 JR高速バスターミナル", finalDestination: arrivalSpot, preference }),
    });
    const data = await response.json();
    setOnwardMessage(response.ok ? (data.provider === "navitime" ? "NAVITIME実データ" : "デモ経路・検索履歴を保存済み") : "検索できませんでした");
  }

  return (
    <main>
      <header className="nav shell">
        <a className="brand" href="#" aria-label="NOLU ホーム"><span>N</span>NOLU <small>by BUSSELECT</small></a>
        <nav aria-label="メインナビゲーション">
          <a href="#ranking">ランキング</a><a href="#reviews">みんなの乗車記</a><a href="#guide">旅のガイド</a>
        </nav>
        <button className="ghost">♡ 保存した便 <b>{saved.length}</b></button>
      </header>

      <section className="hero">
        <div className="shell hero-inner">
          <div className="eyebrow">PRICE × COMFORT × REAL VOICES</div>
          <h1>高速バスを、<br /><em>価格だけで選ばない。</em></h1>
          <p>4,820件の乗車レビューから、眠りやすさ・定時性・設備まで。<br />明日の予定から逆算する、新しいバス選び。</p>

          <div className="search-card">
            <div className="fields">
              <label><small>出発地</small><input value={from} onChange={e => setFrom(e.target.value)} aria-label="出発地" /></label>
              <button className="swap" onClick={swap} aria-label="出発地と到着地を入れ替える">⇄</button>
              <label><small>到着地</small><input value={to} onChange={e => setTo(e.target.value)} aria-label="到着地" /></label>
              <label><small>乗車日</small><input type="date" defaultValue="2026-08-08" aria-label="乗車日" /></label>
              <label><small>人数</small><select aria-label="人数"><option>大人 1名</option><option>大人 2名</option></select></label>
              <button className="search-btn" onClick={() => { setSearched(true); window.location.href = `/search?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&date=2026-08-08`; }}>比較する <span>→</span></button>
            </div>
            <div className="quick"><span>人気:</span><button onClick={() => {setFrom("東京");setTo("大阪")}}>東京 → 大阪</button><button onClick={() => {setFrom("東京");setTo("名古屋")}}>東京 → 名古屋</button><button onClick={() => {setFrom("大阪");setTo("福岡")}}>大阪 → 福岡</button></div>
          </div>
          <div className="trust-row"><span>✓ 掲載便数 12,480便</span><span>✓ 本人確認レビュー</span><span>✓ 予約サイト横断</span></div>
        </div>
      </section>

      <section className="shell comparison" id="ranking">
        <div className="section-head">
          <div><span className="kicker">{searched ? `${from} → ${to} の検索結果` : "今週の注目ルート"}</span><h2>東京 → 大阪を、移動品質で比較</h2><p>8月8日（土）・大人1名　最終更新 3分前</p></div>
          <div className="toggle" role="group" aria-label="並び順">{["総合","快眠","安さ"].map(x => <button key={x} className={priority === x ? "active":""} onClick={() => setPriority(x)}>{x}</button>)}</div>
        </div>
        <div className="bus-grid">
          {ordered.map((bus, index) => (
            <article className={`bus-card ${bus.accent}`} key={bus.name}>
              <div className="rank">{index + 1}</div>
              <div className="bus-top"><div><span className="company">{bus.company}</span><h3>{bus.name}</h3></div><button className={saved.includes(bus.name) ? "heart saved":"heart"} onClick={() => setSaved(s => s.includes(bus.name) ? s.filter(n => n !== bus.name) : [...s,bus.name])}>♥</button></div>
              <div className="route"><div><b>22:50</b><small>東京駅</small></div><span><i />7時間40分<i /></span><div><b>06:30</b><small>大阪駅</small></div></div>
              <div className="quality"><div><small>NOLU快眠スコア</small><strong>{bus.sleep}<i>/100</i></strong></div><div className="stars">★ {bus.score}<small>（{312-index*67}件）</small></div></div>
              <div className="tags">{bus.tags.map(t => <span key={t}>{t}</span>)}</div>
              <div className="bus-foot"><div><small>{bus.delay}</small><strong>¥{bus.price.toLocaleString()}<i>〜</i></strong></div><button>空席・料金を見る</button></div>
              {index === 0 && <div className="choice">総合ベスト</div>}
            </article>
          ))}
        </div>
        <p className="ad-note">※ 予約成立時に提携先から手数料を受け取る場合があります。表示順位への影響はありません。</p>
      </section>

      <section className="onward" id="onward">
        <div className="shell">
          <div className="section-head">
            <div><span className="kicker">AFTER ARRIVAL</span><h2>バスを降りてからも、迷わない。</h2><p>到着時刻に合わせて、最終目的地までのルートと交通費を比較します。</p></div>
            <span className="data-label">{onwardMessage}</span>
          </div>
          <div className="onward-panel">
            <div className="onward-search">
              <label><small>バス降車地</small><b>大阪駅 JR高速バスターミナル</b><span>06:30 到着予定</span></label>
              <span className="chevron">›</span>
              <label><small>最終目的地</small><input value={arrivalSpot} onChange={e => setArrivalSpot(e.target.value)} aria-label="最終目的地" /><span>観光地・ホテル・住所から検索</span></label>
              <button onClick={searchOnward}>ルート検索</button>
            </div>
            <div className="route-tabs" role="group" aria-label="ルートの優先条件">
              {["早い","安い","歩かない"].map(m => <button key={m} className={routeMode === m ? "active":""} onClick={() => setRouteMode(m)}>{m === "早い" ? "最短" : m}</button>)}
              <span>06:38 出発以降</span>
            </div>
            <div className="onward-results">
              <article className="recommended">
                <div className="route-summary"><span>おすすめ</span><strong>{routeMode === "安い" ? "47分" : routeMode === "歩かない" ? "42分" : "36分"}</strong><b>{routeMode === "安い" ? "¥190" : "¥420"}</b><small>乗換 {routeMode === "歩かない" ? "0回" : "1回"}・徒歩 {routeMode === "歩かない" ? "3分" : "8分"}</small></div>
                <div className="timeline">
                  <div><i className="walk" /><time>06:38</time><p><b>大阪駅 高速バスターミナル</b><small>徒歩 6分・屋根あり</small></p></div>
                  <div><i className="train" /><time>06:47</time><p><b>大阪環状線　西九条方面</b><small>大阪 → 西九条　4駅・11分</small></p><em>混雑 少なめ</em></div>
                  <div><i className="train" /><time>07:02</time><p><b>JRゆめ咲線　桜島行</b><small>西九条 → ユニバーサルシティ　2駅・5分</small></p></div>
                  <div><i className="goal" /><time>07:14</time><p><b>{arrivalSpot || "目的地"}</b><small>開園前ロッカー：空きあり予測</small></p></div>
                </div>
                <div className="route-actions"><button>このルートを保存</button><button>地図で見る ↗</button></div>
              </article>
              <aside>
                <div><span>☕</span><p><b>始発待ち 8分</b><small>駅構内カフェは 07:00 開店。待合スペースは利用できます。</small></p></div>
                <div><span>♙</span><p><b>大きな荷物なら</b><small>階段を避けるルートは +6分。エレベーター位置も案内します。</small></p></div>
                <div><span>¥</span><p><b>移動総額 ¥6,620</b><small>高速バス ¥6,200 ＋ 到着後交通費 ¥420</small></p></div>
                <button>到着後スポットも見る</button>
              </aside>
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

      <ReviewHub fallbackReviews={reviews} />

      <section className="shell insight" id="guide">
        <div><span className="kicker">NOLU INSIGHT</span><h2>データでわかる、<br />今月の高速バス。</h2><p>みんなの投票と乗車データから、季節ごとの<br />“失敗しない選び方”を編集部が解説します。</p><button>最新レポートを読む →</button></div>
        <div className="chart-card"><div className="chart-head"><div><small>2026年7月</small><b>快眠できた路線 TOP 5</b></div><span>8,204票</span></div>{[["東京—金沢",94],["東京—大阪",89],["仙台—東京",86],["名古屋—福岡",82],["大阪—広島",78]].map(([n,v],i)=><div className="bar" key={n}><span>{i+1}</span><b>{n}</b><i><em style={{width:`${v}%`}} /></i><strong>{v}</strong></div>)}<small className="source">NOLU乗車後アンケート／有効回答 8,204件</small></div>
      </section>

      <section className="newsletter"><div className="shell"><div><span>✦</span><h2>次の旅を、もっと賢く。</h2><p>値下がり通知、快眠便の新着、週末旅のアイデアを月2回だけ。</p></div><form onSubmit={e => e.preventDefault()}><input type="email" placeholder="メールアドレス" aria-label="メールアドレス" required /><button>無料で受け取る</button></form></div></section>
      <footer className="shell footer"><a className="brand" href="#"><span>N</span>NOLU</a><p>高速バスの比較から、到着後まで。<br />移動を旅の“空白時間”にしない。</p><div><b>探す</b><a href="#">路線から探す</a><a href="#">バス会社から探す</a><a href="#">ランキング</a></div><div><b>NOLUについて</b><a href="#">評価の仕組み</a><a href="#">運営ポリシー</a><a href="#">事業者の方へ</a></div><small>© 2026 NOLU. All rights reserved.</small></footer>
    </main>
  );
}
