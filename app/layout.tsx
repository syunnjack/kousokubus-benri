import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://nolu.example"),
  title: { default: "NOLU | 高速バスを、価格だけで選ばない。", template: "%s | NOLU" },
  description: "料金・快眠度・定時性・設備・口コミを一度に比較できる、高速バスの移動品質ナビ。",
  openGraph: { title: "NOLU", description: "高速バスを、価格だけで選ばない。", locale: "ja_JP", type: "website" },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="ja"><body>{children}</body></html>;
}
