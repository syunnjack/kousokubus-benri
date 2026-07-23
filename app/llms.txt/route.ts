export async function GET() {
  return new Response(
`# BUSSELECT / NOLU

BUSSELECTは、日本の高速バス・夜行バスを料金だけでなく、快眠度、定時率、設備、乗車レビューで比較するサービスです。

## Primary URL
https://busselect.jp/

## Main resources
- 路線ガイド: https://busselect.jp/routes/tokyo-osaka
- 動的検索: https://busselect.jp/search?from=東京&to=大阪
- 評価方法: レビュー、快眠スコア、定時率、料金を個別に表示。広告報酬は順位へ反映しません。
- 到着後ナビ: バス降車地から最終目的地までの所要時間、運賃、乗換、徒歩時間を案内します。

## Data policy
運行事業者・提携データと利用者投稿を区別します。レビューは公開前に審査します。料金・時刻は変動するため、予約前に提携先の最新情報を確認してください。
`,
    { headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "public, max-age=3600" } },
  );
}
