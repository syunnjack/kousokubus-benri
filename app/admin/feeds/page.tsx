import { requireChatGPTUser } from "../../chatgpt-auth";
import { isNoluAdmin } from "../../admin-auth";
import { getD1 } from "../../../db/d1";
import { FeedManager } from "./feed-manager";

export const dynamic = "force-dynamic";

export default async function AdminFeedsPage() {
  const user = await requireChatGPTUser("/admin/feeds");
  if (!isNoluAdmin(user)) return <main className="admin-page"><section><h1>アクセスできません</h1></section></main>;
  const [feeds, runs] = await Promise.all([
    getD1().prepare(`SELECT id, name, source_key AS sourceKey, feed_type AS feedType, endpoint_url AS endpointUrl, schedule, secret_env_name AS secretEnvName, enabled, last_imported_at AS lastImportedAt FROM feed_sources ORDER BY enabled DESC, name`).all(),
    getD1().prepare(`SELECT id, source_key AS sourceKey, file_name AS fileName, status, total_rows AS totalRows, inserted_rows AS insertedRows, updated_rows AS updatedRows, error_rows AS errorRows, imported_by AS importedBy, created_at AS createdAt FROM import_runs ORDER BY created_at DESC LIMIT 50`).all(),
  ]);
  return <main className="admin-page">
    <header><a className="brand" href="/"><span>N</span>NOLU</a><div><small>運用者</small><b>{user.displayName}</b></div></header>
    <section><span className="kicker">DATA OPERATIONS</span><h1>データフィード管理</h1><p>事業者・提携先ごとの接続設定と、CSV/API取込の実行結果を確認します。</p><nav className="admin-tabs"><a href="/admin">概要</a><a href="/admin/services">便データ</a><a href="/admin/reviews">レビュー</a></nav>
      <FeedManager initialFeeds={feeds.results as never[]} />
      <section className="import-history"><div><span className="kicker">IMPORT HISTORY</span><h2>直近の取込履歴</h2></div>
        <div className="history-table"><div className="history-head"><span>日時・提供元</span><span>ファイル</span><span>結果</span><span>内訳</span></div>
          {runs.results.length ? runs.results.map((run) => <div key={String(run.id)}><span><b>{new Date(Number(run.createdAt)).toLocaleString("ja-JP")}</b><small>{String(run.sourceKey)}・{String(run.importedBy || "")}</small></span><span>{String(run.fileName || "API/手動")}</span><span><em className={`run-${String(run.status)}`}>{run.status === "success" ? "成功" : run.status === "partial" ? "一部エラー" : "失敗"}</em></span><span><b>{String(run.totalRows)}件</b><small>新規{String(run.insertedRows)}・更新{String(run.updatedRows)}・エラー{String(run.errorRows)}</small></span></div>) : <p className="admin-empty">取込履歴はまだありません。</p>}
        </div>
      </section>
    </section>
  </main>;
}
