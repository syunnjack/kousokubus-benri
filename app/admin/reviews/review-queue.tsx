"use client";

import { useState } from "react";

type PendingReview = {
  id: string;
  displayName: string;
  serviceName: string;
  rating: number;
  body: string;
  rideDate: string | null;
  createdAt: number;
};

export function ReviewQueue({ initialReviews }: { initialReviews: PendingReview[] }) {
  const [reviews, setReviews] = useState(initialReviews);
  const [message, setMessage] = useState("");

  async function moderate(id: string, status: "published" | "rejected") {
    const response = await fetch(`/api/admin/reviews/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (!response.ok) {
      setMessage("更新できませんでした。再読み込みしてお試しください。");
      return;
    }
    setReviews((current) => current.filter((review) => review.id !== id));
    setMessage(status === "published" ? "レビューを公開しました。" : "レビューを非公開にしました。");
  }

  return (
    <>
      {message && <p className="admin-message" role="status">{message}</p>}
      {!reviews.length && <div className="admin-empty">審査待ちのレビューはありません。</div>}
      <div className="admin-list">
        {reviews.map((review) => (
          <article key={review.id}>
            <div><span>★ {review.rating}</span><b>{review.displayName}</b><small>{review.serviceName}・{review.rideDate || "乗車日未入力"}</small></div>
            <p>{review.body}</p>
            <footer><time>{new Date(review.createdAt).toLocaleString("ja-JP")}</time><div><button className="reject" onClick={() => moderate(review.id, "rejected")}>非公開</button><button onClick={() => moderate(review.id, "published")}>公開する</button></div></footer>
          </article>
        ))}
      </div>
    </>
  );
}
