"use client";

import { FormEvent, useState } from "react";

type Feed = { id: string; name: string; sourceKey: string; feedType: string; endpointUrl: string | null; schedule: string; secretEnvName: string | null; enabled: number; lastImportedAt: number | null };

export function FeedManager({ initialFeeds }: { initialFeeds: Feed[] }) {
  const [feeds, setFeeds] = useState(initialFeeds);
  const [message, setMessage] = useState("");
  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    setMessage("登録中…");
    const response = await fetch("/api/admin/feeds", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(Object.fromEntries(new FormData(form))) });
    const data = await response.json();
    if (!response.ok) return setMessage(data.error || "登録できませんでした。");
    setMessage("データ提供元を登録しました。再読み込みすると一覧へ反映されます。");
    form.reset();
  }
  async function toggle(feed: Feed) {
    const enabled = !feed.enabled;
    const response = await fetch(`/api/admin/feeds/${feed.id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ enabled }) });
    if (!response.ok) return setMessage("状態を変更できませんでした。");
    setFeeds((items) => items.map((item) => item.id === feed.id ? { ...item, enabled: enabled ? 1 : 0 } : item));
    setMessage(`${feed.name}を${enabled ? "有効" : "停止"}にしました。`);
  }
  return <>
    <form className="feed-create" onSubmit={create}>
      <div><span className="kicker">NEW SOURCE</span><h2>データ提供元を登録</h2><p>APIキー自体は保存せず、本番環境のシークレット名だけを管理します。</p></div>
      <div className="feed-fields">
        <label>提供元名<input name="name" required placeholder="○○バス株式会社" /></label>
        <label>sourceKey<input name="sourceKey" required pattern="[a-z0-9_-]+" placeholder="operator-a" /></label>
        <label>方式<select name="feedType"><option value="csv">CSV</option><option value="api">API</option><option value="sftp">SFTP</option></select></label>
        <label>更新頻度<select name="schedule"><option value="manual">手動</option><option value="hourly">1時間ごと</option><option value="daily">毎日</option></select></label>
        <label>接続先URL<input name="endpointUrl" type="url" placeholder="https://api.example.jp/..." /></label>
        <label>シークレット環境変数名<input name="secretEnvName" pattern="[A-Z][A-Z0-9_]*" placeholder="OPERATOR_A_API_KEY" /></label>
      </div>
      <button>提供元を登録</button>
    </form>
    {message && <p className="admin-message" role="status">{message}</p>}
    <div className="feed-list">{feeds.length ? feeds.map((feed) => <article key={feed.id}>
      <header><div><small>{feed.feedType.toUpperCase()}・{feed.schedule}</small><h3>{feed.name}</h3><code>{feed.sourceKey}</code></div><span className={feed.enabled ? "feed-live" : "feed-off"}>{feed.enabled ? "有効" : "停止中"}</span></header>
      <dl><div><dt>接続先</dt><dd>{feed.endpointUrl || "未設定"}</dd></div><div><dt>認証設定</dt><dd>{feed.secretEnvName || "不要・未設定"}</dd></div><div><dt>最終取込</dt><dd>{feed.lastImportedAt ? new Date(feed.lastImportedAt).toLocaleString("ja-JP") : "まだありません"}</dd></div></dl>
      <button type="button" className={feed.enabled ? "stop" : ""} onClick={() => toggle(feed)}>{feed.enabled ? "一時停止" : "有効にする"}</button>
    </article>) : <p className="admin-empty">データ提供元はまだ登録されていません。</p>}</div>
  </>;
}
