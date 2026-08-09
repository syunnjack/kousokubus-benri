/**
 * JST の当日を YYYY-MM-DD で返す。
 * Cloudflare Workers は UTC で動くため、+9時間してから日付部分を切り出す。
 */
export function todayInJst(): string {
  return new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
}
