import type { Metadata } from "next";
import Script from "next/script";
import { SITE_URL } from "../lib/site";
import "./globals.css";

const gaId = process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS_MEASUREMENT_ID;
const gscToken = process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION;

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: "NOLU | 高速バスを、価格だけで選ばない。", template: "%s | NOLU" },
  description: "料金・快眠度・定時性・設備・口コミを一度に比較できる、高速バスの移動品質ナビ。",
  alternates: { canonical: "/" },
  openGraph: { title: "NOLU by BUSSELECT", description: "高速バスを、価格だけで選ばない。", locale: "ja_JP", type: "website", url: "/" },
  robots: { index: true, follow: true },
  verification: { google: "oZwpaNI66r9fBNEagYXlyEraiRbUKKuzXGJ_x2Dj3BM" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ja">
      <head>
        {gaId ? (
          <>
            <Script async src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`} />
            <Script id="ga4-init">{`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${gaId}');`}</Script>
          </>
        ) : null}
      </head>
      <body>{children}</body>
    </html>
  );
}
