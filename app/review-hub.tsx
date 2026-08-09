"use client";

import { FormEvent, useEffect, useState } from "react";

type Review = {
  id: string;
  displayName: string;
  rating: number;
  body: string;
  helpfulCount: number;
  verifiedRide?: number;
};

export function ReviewHub({ serviceId, routeLabel }: { serviceId?: string; routeLabel?: string }) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState("");

  useEffect(() => {
    if (!serviceId) {
      setLoaded(true);
      return;
    }
    fetch(`/api/reviews?serviceId=${encodeURIComponent(serviceId)}`)
      .then((res) => res.ok ? res.json() : Promise.reject(new Error(String(res.status))))
      .then((data) => setReviews(data.reviews || []))
      .catch(() => undefined)
      .finally(() => setLoaded(true));
  }, [serviceId]);

  async function submitReview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!serviceId) return;
    const form = event.currentTarget;
    setStatus("送信中…");
    const data = new FormData(form);
    const response = await fetch("/api/reviews", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        serviceId,
        displayName: data.get("displayName"),
        rating: Number(data.get("rating")),
        sleepRating: Number(data.get("sleepRating")),
        body: data.get("body"),
        rideDate: data.get("rideDate"),
      }),
    });
    if (response.status === 401) {
      setStatus("レビュー投稿にはChatGPTでのサインインが必要です。");
      return;
    }
    const payload = await response.json();
    setStatus(payload.message || payload.error || "送信できませんでした。");
    if (response.ok) form.reset();
  }

  async function helpful(review: Review, index: number) {
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
        <div>
          <span className="kicker">REAL VOICES</span>
          <h2>昨夜、乗った人の声。</h2>
          <p>{routeLabel ? `${routeLabel}の乗車体験を共有すると、次の人の便選びがもっと確かになります。` : "乗車体験を共有すると、次の人の便選びがもっと確かになります。"}</p>
        </div>
        {serviceId && (
          <button className="outline" onClick={() => setOpen((value) => !value)}>
            {open ? "閉じる" : "乗車レビューを書く ＋"}
          </button>
        )}
      </div>
      {open && serviceId && (
        <form className="review-form" onSubmit={submitReview}>
          <div><label>表示名<input name="displayName" required maxLength={40} placeholder="例：週末トラベラー" /></label><label>乗車日<input name="rideDate" type="date" /></label></div>
          <div><label>総合評価<select name="rating" defaultValue="5">{[5,4,3,2,1].map(n => <option key={n} value={n}>★ {n}</option>)}</select></label><label>眠りやすさ<select name="sleepRating" defaultValue="5">{[5,4,3,2,1].map(n => <option key={n} value={n}>★ {n}</option>)}</select></label></div>
          <label>乗車した感想<textarea name="body" required minLength={20} maxLength={1200} placeholder="座席、車内環境、到着後の体調などを20文字以上で教えてください。" /></label>
          <div className="form-foot"><small>投稿は運営確認後に公開されます。個人情報は入力しないでください。</small><button>レビューを送信</button></div>
          {status && <p className="form-status" role="status">{status}</p>}
        </form>
      )}
      {loaded && !reviews.length && (
        <p className="admin-empty">
          {serviceId
            ? "まだ公開済みのレビューがありません。最初の乗車記を投稿してください。"
            : "レビュー対象の便を準備中です。"}
        </p>
      )}
      {reviews.length > 0 && (
        <div className="review-grid">
          {reviews.map((review, index) => (
            <article key={review.id}>
              <div className="review-meta"><span className="avatar">{review.displayName.slice(0, 1)}</span><div><b>{review.displayName}</b><small>{review.verifiedRide ? "乗車確認済み" : "投稿レビュー"}</small></div><strong>★ {review.rating}</strong></div>
              <p>「{review.body}」</p>
              <div><span>{routeLabel || ""}</span><button onClick={() => helpful(review, index)}>♡ 参考になった {review.helpfulCount}</button></div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
