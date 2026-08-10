import type { Metadata } from "next";
import { SITE_URL } from "../../lib/site";

// 運営者情報は環境変数で差し込む。未設定のまま「要記入」を公開しないよう、
// 値が無い項目は「準備中」と表示する。
const operatorName = process.env.NEXT_PUBLIC_OPERATOR_NAME;
const operatorAddress = process.env.NEXT_PUBLIC_OPERATOR_ADDRESS;
const operatorContact = process.env.NEXT_PUBLIC_OPERATOR_CONTACT;
const PENDING = "準備中";

export const metadata: Metadata = {
  title: "運営者情報・掲載方針",
  description: "NOLU（BUSSELECT）の運営者情報、掲載データの出典、快眠スコアと定時率の考え方、広告・アフィリエイトの開示方針をまとめています。",
  alternates: { canonical: "/about" },
};

export default function AboutPage() {
  return (
    <main className="legal-page">
      <header className="results-nav"><a className="brand" href="/"><span>N</span>NOLU <small>by BUSSELECT</small></a><a href="/routes">全国の路線</a></header>
      <div className="legal-shell">
        <nav><a href="/">ホーム</a> / 運営者情報・掲載方針</nav>
        <h1>運営者情報・掲載方針</h1>
        <p>NOLUは、高速バス・夜行バスを料金だけでなく移動品質で比較し、降車後の移動まで案内することを目的としたサイトです。掲載しているデータの出どころと、評価・広告の扱いを以下に開示します。</p>

        <section>
          <h2>運営者情報</h2>
          <dl>
            <div><dt>サイト名</dt><dd>NOLU（by BUSSELECT）</dd></div>
            <div><dt>URL</dt><dd>{SITE_URL}</dd></div>
            <div><dt>運営者名</dt><dd>{operatorName || PENDING}</dd></div>
            <div><dt>所在地</dt><dd>{operatorAddress || PENDING}</dd></div>
            <div><dt>連絡先</dt><dd>{operatorContact || PENDING}</dd></div>
          </dl>
        </section>

        <section id="method">
          <h2>評価指標の考え方</h2>
          <h3>NOLU快眠スコア（0〜100）</h3>
          <p>座席タイプ、シート仕様、利用者レビューをもとに、運営者が便ごとに登録している独自の目安値です。自動計測や第三者機関による測定値ではありません。同じ便でも車両や号車によって実際の座席は異なる場合があります。</p>
          <h3>定時率</h3>
          <p>便ごとに登録している到着定時の目安です。出典は便によって異なり、道路状況・天候により実際の運行は変動します。遅延の可否を保証するものではありません。</p>
          <h3>口コミ・レビュー</h3>
          <p>利用者の投稿です。投稿は運営確認後に公開し、確認できた乗車については「乗車確認済み」を表示します。個人の感想であり、同じ便でも体験は異なります。</p>
        </section>

        <section id="data">
          <h2>掲載データについて</h2>
          <h3>公式GTFSダイヤ</h3>
          <p>「公式GTFS」と表示している時刻表は、各バス事業者・自治体が公開しているGTFSフィードを取り込んだものです。各停留所ページに出典・ライセンス・配布元へのリンクを表示しています。多くはクリエイティブ・コモンズ 表示 4.0 国際（CC BY 4.0）で提供されています。</p>
          <h3>高速バスの便・運賃</h3>
          <p>運行会社の公開情報および提携データをもとに掲載しています。運賃は変動するため、表示金額は目安です。確定運賃・空席は各予約サイトまたは運行会社の公式ページでご確認ください。</p>
          <h3>更新頻度</h3>
          <p>公式GTFSは1日1回、事業者フィードは1時間ごとに同期を試行しています。同期状況により最新のダイヤ改正が反映されていない場合があります。</p>
          <h3>免責</h3>
          <p>掲載内容の正確性・完全性を保証するものではありません。運行の可否、遅延、運賃、予約の成立について当サイトは責任を負いません。予約前に必ず提携先・運行会社の最新情報をご確認ください。</p>
        </section>

        <section id="ads">
          <h2>広告・アフィリエイトの開示</h2>
          <p>当サイトは、予約サイトへの送客が成立した場合に提携先から手数料を受け取ることがあります。手数料の有無や料率は、検索結果の表示順位・快眠スコア・定時率・レビューの表示に影響しません。並び替えは利用者が選んだ基準（おすすめ・快眠・安い）にのみ従います。</p>
          <p>提携がない便については、運行会社の公式サイトへ案内するか、送客リンクを表示せず「連携準備中」と明示します。</p>
        </section>

        <section>
          <h2>お問い合わせ</h2>
          <p>掲載内容の訂正依頼、事業者からの掲載・提携のご相談、レビューの削除依頼は、上記の連絡先までご連絡ください。{operatorContact ? "" : "連絡先は準備中です。"}</p>
          <p>個人情報の取り扱いは<a href="/privacy">プライバシーポリシー</a>をご確認ください。</p>
        </section>
      </div>
    </main>
  );
}
