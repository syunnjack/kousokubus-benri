"use client";
import { FormEvent, useState } from "react";

type Result = { stops: { id: string; name: string; code: string | null; agencyName: string; tripCount: number }[]; lines: { id: string; shortName: string | null; longName: string | null; agencyName: string; tripCount: number; color: string | null }[] };
export function LocalBusSearch() {
  const [result, setResult] = useState<Result | null>(null), [loading, setLoading] = useState(false), [message, setMessage] = useState("");
  async function search(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setLoading(true); setMessage("");
    const query = String(new FormData(event.currentTarget).get("q") || "").trim();
    const response = await fetch(`/api/local-bus/search?q=${encodeURIComponent(query)}`);
    const data = await response.json(); setLoading(false);
    if (!response.ok) return setMessage(data.error || "検索できませんでした。");
    setResult(data); if (!data.stops.length && !data.lines.length) setMessage("該当する停留所・路線がありません。");
  }
  return <section className="local-search-panel"><form onSubmit={search}><label><span>停留所名・路線名</span><input name="q" required placeholder="例：新宿駅、渋谷、循環バス" /></label><button disabled={loading}>{loading ? "検索中…" : "路線バスを検索"}</button></form>{message && <p role="status">{message}</p>}{result && <div className="local-results"><section><h2>停留所</h2>{result.stops.map((stop) => <a key={stop.id} href={`/local-bus/stops/${encodeURIComponent(stop.id)}`}><div><b>{stop.name}</b><small>{stop.agencyName}{stop.code ? `・${stop.code}` : ""}</small></div><span>{stop.tripCount}便 →</span></a>)}</section><section><h2>路線</h2>{result.lines.map((line) => <article key={line.id}><i style={{ background: line.color ? `#${line.color}` : "#174c3b" }} /><div><b>{line.shortName || line.longName}</b><small>{line.longName !== line.shortName ? line.longName : ""}・{line.agencyName}</small></div><span>{line.tripCount}便</span></article>)}</section></div>}</section>;
}
