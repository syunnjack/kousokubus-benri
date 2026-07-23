"use client";

import { FormEvent, useEffect, useState } from "react";

type Review = {
  id?: string;
  displayName?: string;
  user?: string;
  rating?: number;
  score?: string;
  body?: string;
  text?: string;
  helpfulCount?: number;
  helpful?: number;
  verifiedRide?: number;
  badge?: string;
};

export function ReviewHub({ fallbackReviews }: { fallbackReviews: Review[] }) {
  const [reviews, setReviews] = useState<Review[]>(fallbackReviews);
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState("");
  const serviceId = "service-grandream-7";

  useEffect(() => {
    fetch(`/api/reviews?serviceId=${serviceId}`)
      .then((res) => res.ok ? res.json() : Promise.reject())
      .then((data) => data.reviews?.length && setReviews(data.reviews))
      .catch(() => undefined);
  }, []);

  async function submitReview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("送信中…");
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/reviews", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        serviceId,
        displayName: form.get("displayName"),
        rating: Number(form.get("rating")),
        sleepRating: Number(form.get("sleepRating")),
        body: form.get("body"),
        rideDate: form.get("rideDate"),
      }),
    });
    const data = await response.json();
    if (response.status === 401) {
      setStatus("レビュー投稿にはChatGPTでのサインインが必要です。");
      return;
    }
    setStatus(data.message || data.error || "送信できませんでした。");
    if (response.ok) event.currentTarget.reset();
  }

  async function helpful(review: Review, index: number) {
    if (!review.id) return;
    const response = await fetch(`/api/reviews/${review.id}/helpful`, { method: "POST" });
    if (!response.ok) return;
    const data = await response.json();
    setReviews((current) => current.map((item, i) =>
      i === index ? { ...item, helpfulCount: data.helpfulCount } : item
    ));
  }

  return (
    <section className="shell review-section" id="reviews">
      <div className="section-head">
        <div><span className="kicker">REAL VOICES</span><h2>昨夜、乗った人の声。</h2><p>乗車体験を共有すると、次の人の便選びがもっと確かになります。</p></div>
        <button className="outline" onClick={() => setOpen((value) => !value)}>
          {open ? "閉じる" : "乗車レビューを書く ＋"}
        </button>
      </div>
      {open && (
        <form className="review-form" onSubmit={submitReview}>
          <div><label>表示名<input name="displayName" required maxLength={40} placeholder="例：週末トラベラー" /></label><label>乗車日<input name="rideDate" type="date" /></label></div>
          <div><label>総合評価<select name="rating" defaultValue="5">{[5,4,3,2,1].map(n => <option key={n} value={n}>★ {n}</option>)}</select></label><label>眠りやすさ<select name="sleepRating" defaultValue="5">{[5,4,3,2,1].map(n => <option key={n} value={n}>★ {n}</option>)}</select></label></div>
          <label>乗車した感想<textarea name="body" required minLength={20} maxLength={1200} placeholder="座席、車内環境、到着後の体調などを20文字以上で教えてください。" /></label>
          <div className="form-foot"><small>投稿は運営確認後に公開されます。個人情報は入力しないでください。</small><button>レビューを送信</button></div>
          {status && <p className="form-status" role="status">{status}</p>}
        </form>
      )}
      <div className="review-grid">
        {reviews.map((review, index) => {
          const name = review.displayName || review.user || "NOLUユーザー";
          return (
            <article key={review.id || `${name}-${index}`}>
              <div className="review-meta"><span className="avatar">{name[0]}</span><div><b>{name}</b><small>{review.verifiedRide ? "乗車確認済み" : review.badge || "投稿レビュー"}</small></div><strong>★ {review.rating || review.score}</strong></div>
              <p>「{review.body || review.text}」</p>
              <div><span>東京 → 大阪</span><button onClick={() => helpful(review, index)}>♡ 参考になった {review.helpfulCount ?? review.helpful ?? 0}</button></div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
