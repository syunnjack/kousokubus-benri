/**
 * 正規ドメインの一元定義。
 * canonical / sitemap / robots / JSON-LD は全てここを参照するため、
 * 公開ドメインを変えるときはこのファイルだけを書き換えればよい。
 */
export const SITE_URL = "https://busselect.jp";

/** 正規ホスト名。これ以外のホストで配信された応答は noindex にする（worker/index.ts）。 */
export const SITE_HOST = new URL(SITE_URL).host;

/** SITE_URL からの絶対URLを組み立てる。path は "/routes" のように先頭スラッシュ付きで渡す。 */
export function siteUrl(path = ""): string {
  return `${SITE_URL}${path}`;
}
