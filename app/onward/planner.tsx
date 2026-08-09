"use client";

import { FormEvent, useMemo, useState } from "react";
import type { GeoPoint } from "../../lib/geocode";
import { RouteMap } from "./route-map";

type RouteResult = {
  provider: string;
  route: { durationMinutes: number; fare: number; transferCount: number; walkMinutes: number };
  map?: { start: GeoPoint; end: GeoPoint; coordinates: [number, number][] } | null;
};

export function OnwardPlanner({ initialArrival }: { initialArrival: string }) {
  const [arrival, setArrival] = useState(initialArrival || "バスタ新宿");
  const [destination, setDestination] = useState("");
  const [preference, setPreference] = useState("fast");
  const [result, setResult] = useState<RouteResult|null>(null);
  const [loading, setLoading] = useState(false);
  const links = useMemo(() => {
    const query = `api=1&origin=${encodeURIComponent(arrival)}&destination=${encodeURIComponent(destination)}`;
    return {
      transit: `https://www.google.com/maps/dir/?${query}&travelmode=transit`,
      walking: `https://www.google.com/maps/dir/?${query}&travelmode=walking`,
      taxi: `https://www.google.com/maps/dir/?${query}&travelmode=driving`,
    };
  }, [arrival, destination]);
  async function search(event: FormEvent) {
    event.preventDefault(); setLoading(true); setResult(null);
    const response = await fetch("/api/onward", { method:"POST", headers:{"content-type":"application/json"}, body:JSON.stringify({arrivalStop:arrival,finalDestination:destination,preference}) });
    const data = await response.json(); if(response.ok) setResult(data); setLoading(false);
  }
  return <section className="planner-shell">
    <form className="planner-form" onSubmit={search}>
      <label><span>高速バスの降車地</span><input value={arrival} onChange={e=>setArrival(e.target.value)} required placeholder="例：バスタ新宿、東京駅八重洲口"/></label>
      <i>→</i>
      <label><span>最終目的地</span><input value={destination} onChange={e=>setDestination(e.target.value)} required placeholder="ホテル、観光地、住所、駅名"/></label>
      <fieldset><legend>優先条件</legend>{[["fast","早く"],["cheap","安く"],["low_walk","歩きを少なく"]].map(([value,label])=><label key={value}><input type="radio" name="preference" value={value} checked={preference===value} onChange={()=>setPreference(value)}/><span>{label}</span></label>)}</fieldset>
      <button disabled={loading}>{loading?"検索中…":"ルートを検索"}</button>
    </form>
    {result&&<div className="planner-result"><header><div><span className="kicker">ROUTE SUMMARY</span><h2>{arrival} → {destination}</h2></div><strong>{result.route.durationMinutes}分</strong></header><dl><div><dt>運賃目安</dt><dd>¥{result.route.fare.toLocaleString()}</dd></div><div><dt>乗換</dt><dd>{result.route.transferCount}回</dd></div><div><dt>徒歩</dt><dd>{result.route.walkMinutes}分</dd></div><div><dt>データ</dt><dd>{result.provider==="navitime"?"交通API":"概算＋外部経路"}</dd></div></dl></div>}
    {result?.map&&<RouteMap start={result.map.start} end={result.map.end} coordinates={result.map.coordinates} />}
    <div className="transport-choice">
      <article><b>BUS</b><h2>路線バス</h2><p>登録済み4,304停留所の時刻表から、到着地周辺を確認します。</p><a href="/local-bus">停留所・時刻表を検索 →</a></article>
      <article><b>RAIL</b><h2>電車・地下鉄</h2><p>鉄道と地下鉄を含む公共交通ルートを地図アプリで開きます。</p><a href={links.transit} target="_blank" rel="noreferrer">公共交通ルート →</a></article>
      <article><b>WALK</b><h2>徒歩</h2><p>出口から目的地までの徒歩経路と距離を確認します。</p><a href={links.walking} target="_blank" rel="noreferrer">徒歩ルート →</a></article>
      <article><b>TAXI</b><h2>タクシー</h2><p>道路経路と所要時間を確認してから配車サービスへ進めます。</p><a href={links.taxi} target="_blank" rel="noreferrer">タクシー経路 →</a></article>
    </div>
    <aside className="planner-note">時刻・運賃・運行状況は変わる場合があります。予約や乗車前に交通事業者・配車サービスの最新情報も確認してください。</aside>
  </section>;
}
