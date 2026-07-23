import type { Metadata } from "next";
import { BusFinder } from "./bus-finder";

export const metadata: Metadata = {
  title: "NOLU | 高速バスを、価格だけで選ばない。",
  description:
    "料金・快眠度・定時性・設備・口コミを一度に比較。あなたに合う夜行バス・高速バスを見つける移動品質ナビ。",
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "NOLU",
  description: "高速バス・夜行バスの移動品質比較ナビ",
  potentialAction: {
    "@type": "SearchAction",
    target: "https://nolu.example/search?from={from}&to={to}",
    "query-input": ["required name=from", "required name=to"],
  },
};

export default function Home() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <BusFinder />
    </>
  );
}
