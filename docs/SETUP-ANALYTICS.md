# busselect.jp — 公開・Analytics 設定

## デプロイ方法

**`git push` では本番に反映されません。** このリポジトリにはデプロイ手段がありません
（`package.json` に deploy スクリプトなし、`.github/workflows/` は同期とIndexNowのみ、
`wrangler.toml` もなし）。

反映は **Site Creator / Codex のセッションに「デプロイして」と依頼**して行います。
反映確認は変更したファイルへのHTTPリクエストで行ってください。

```bash
curl -sI https://busselect.jp/busselectindex2026.txt   # 200 なら反映済み
```

なお GTFS 同期（`sync-gtfs.yml`）はデータをD1へ直接書き込むため、**デプロイ不要**です。
push すれば次回のスケジュール実行から新しいソースが対象になります。即時反映したい場合:

```bash
gh workflow run sync-gtfs.yml
```

## 環境変数

| 変数 | 用途 | 未設定時 |
| --- | --- | --- |
| `NEXT_PUBLIC_GOOGLE_ANALYTICS_MEASUREMENT_ID` | GA4 | GA4タグを出力しない |
| `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION` | Search Console 所有権確認 | metaタグを出力しない |
| `NEXT_PUBLIC_OPERATOR_NAME` | `/about` の運営者名 | 「準備中」と表示 |
| `NEXT_PUBLIC_OPERATOR_ADDRESS` | `/about` の所在地 | 「準備中」と表示 |
| `NEXT_PUBLIC_OPERATOR_CONTACT` | `/about` の連絡先 | 「準備中」と表示 |

運営者情報の3項目は、アフィリエイト収益がある以上、公開前に設定してください。

GitHub Secret: `INDEXNOW_KEY` = `busselectindex2026`
GitHub Secret: `NOLU_CRON_URL` / `NOLU_CRON_SECRET`（GTFS・事業者フィード同期に必須）

## ドメイン（設定済み）

- 正規URL: `https://busselect.jp`（`lib/site.ts` の `SITE_URL` が唯一の定義箇所）
- ネームサーバー: `01.dnsv.jp`〜`04.dnsv.jp`（お名前.com）
- A: `162.159.143.30` / `172.66.3.26`
- 検証用TXT: `_cf-custom-hostname` / `_openai-site-verification`
  — **削除しないこと。** 定期的に再検証され、消すと証明書が失効します
- `www.busselect.jp` はレコード未設定のため解決しません。必要なら `www` の CNAME を
  `busselect.jp` に向けてください（canonical は apex なので必須ではありません）

正規ホスト以外（`*.chatgpt.site` など）で配信された応答には `worker/index.ts` が
`X-Robots-Tag: noindex` を付けます。ドメインを変える場合も `SITE_URL` の変更だけで追随します。

## 公開後の確認

```bash
curl -I https://busselect.jp/
curl -sI https://busselect.jp/ | grep -i x-robots-tag   # 何も出なければ正常
curl -s https://busselect.jp/robots.txt
```

Search Console → `https://busselect.jp/sitemap.xml` 送信
