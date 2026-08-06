# busselect.jp — 公開・Analytics 設定

## パッチ適用（0002 推奨 — 現行 layout.tsx 対応）

```powershell
cd C:\Users\syunn\source\repos\kousokubus-benri
curl.exe -L -o busselect-seo.patch "https://github.com/syunnjack/rakuten02/raw/master/patches/kousokubus-benri/0002-Add-GA4-Search-Console-and-IndexNow-for-current-layout.patch"
git am busselect-seo.patch
git push origin main
```

0001 が失敗する場合は 0002 を使用してください（リポジトリ更新により layout が変更済み）。

## 環境変数

| 変数 | 用途 |
|------|------|
| `NEXT_PUBLIC_GOOGLE_ANALYTICS_MEASUREMENT_ID` | GA4 |
| `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION` | Search Console |

GitHub Secret: `INDEXNOW_KEY` = `busselectindex2026`

## DNS

お名前.com: `150.95.255.38` パーキング削除 → Site Creator / vinext 指定 DNS

## 公開後

```powershell
Invoke-WebRequest https://busselect.jp/sitemap.xml -UseBasicParsing
Invoke-WebRequest https://busselect.jp/busselectindex2026.txt -UseBasicParsing
```

Search Console → `https://busselect.jp/sitemap.xml` 送信
