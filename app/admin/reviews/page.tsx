import { requireChatGPTUser } from "../../chatgpt-auth";
import { getD1 } from "../../../db/d1";
import { ReviewQueue } from "./review-queue";

export const dynamic = "force-dynamic";

export default async function AdminReviewsPage() {
  const user = await requireChatGPTUser("/admin/reviews");
  const result = await getD1().prepare(`
    SELECT rv.id, rv.display_name AS displayName, rv.rating, rv.body,
      rv.ride_date AS rideDate, rv.created_at AS createdAt,
      s.service_name AS serviceName
    FROM reviews rv
    JOIN services s ON s.id = rv.service_id
    WHERE rv.status = 'pending'
    ORDER BY rv.created_at ASC
    LIMIT 100
  `).all();

  return (
    <main className="admin-page">
      <header><a className="brand" href="/"><span>N</span>NOLU</a><div><small>運営者</small><b>{user.displayName}</b></div></header>
      <section>
        <span className="kicker">MODERATION</span>
        <h1>レビュー審査</h1>
        <p>体験に基づく具体的な投稿を公開し、個人情報・誹謗中傷・宣伝を含む投稿は非公開にします。</p>
        <ReviewQueue initialReviews={result.results as never[]} />
      </section>
    </main>
  );
}
