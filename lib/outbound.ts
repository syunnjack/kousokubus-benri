/**
 * 送客先URLの解決順序を表す SQL 式。`services` を別名 `s` で JOIN しているクエリで使う。
 *
 * 1. services.booking_url … 提携予約サイト（アフィリエイト）
 * 2. 同じ事業者名で取り込んだ公式GTFSカタログの公式URL
 * 3. 同じ事業者名の GTFS agency_url
 *
 * いずれも無ければ NULL。UI 側は NULL のとき送客リンクを出さず、
 * 「準備中」と明示する（行き止まりのリンクを踏ませない）。
 */
export const OUTBOUND_URL_SQL = `COALESCE(
  s.booking_url,
  (SELECT h.official_url FROM highway_catalog h WHERE h.operator_name = s.operator_name AND h.official_url IS NOT NULL LIMIT 1),
  (SELECT a.url FROM bus_agencies a WHERE a.name = s.operator_name AND a.url IS NOT NULL LIMIT 1)
)`;

/** 送客リンクのラベル。提携予約サイトか公式サイトかを利用者に明示する。 */
export function outboundLabel(bookingUrl: unknown, outboundUrl: unknown, soldOut = false): string | null {
  if (!outboundUrl) return null;
  if (soldOut) return "ほかの便を見る";
  return bookingUrl ? "予約サイトへ" : "運行会社の公式サイトへ";
}
