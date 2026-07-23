"use client";

import { FormEvent, useState } from "react";

type Service = { id: string; routeName: string; operatorName: string; serviceName: string; departureTime: string; arrivalTime: string; basePrice: number; sleepScore: number; onTimeRate: number; bookingUrl: string | null };

export function ServiceManager({ initialServices }: { initialServices: Service[] }) {
  const [services, setServices] = useState(initialServices);
  const [message, setMessage] = useState("");
  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setMessage("登録中…");
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/admin/services", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(Object.fromEntries(form)) });
    const data = await response.json();
    if (!response.ok) return setMessage(data.error || "登録できませんでした。");
    setMessage("便を登録しました。ページを再読み込みすると一覧へ反映されます。"); event.currentTarget.reset();
  }
  async function update(service: Service, form: HTMLFormElement) {
    const values = new FormData(form);
    const response = await fetch(`/api/admin/services/${service.id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(Object.fromEntries(values)) });
    const data = await response.json();
    setMessage(response.ok ? `${service.serviceName}を更新しました。` : data.error || "更新できませんでした。");
    if (response.ok) setServices((current) => current.map((item) => item.id === service.id ? { ...item, basePrice: Number(values.get("basePrice")), sleepScore: Number(values.get("sleepScore")), onTimeRate: Number(values.get("onTimeRate")), bookingUrl: String(values.get("bookingUrl") || "") || null } : item));
  }
  return (
    <>
      <form className="service-create" onSubmit={create}>
        <h2>新しい便を登録</h2>
        <div><label>出発地<input name="originName" required placeholder="東京" /></label><label>到着地<input name="destinationName" required placeholder="大阪" /></label><label>路線URL用slug<input name="routeSlug" required pattern="[a-z0-9-]+" placeholder="tokyo-osaka" /></label></div>
        <div><label>運行会社<input name="operatorName" required /></label><label>便名<input name="serviceName" required /></label><label>座席タイプ<input name="seatType" placeholder="独立3列" /></label></div>
        <div><label>出発時刻<input name="departureTime" type="time" required /></label><label>到着時刻<input name="arrivalTime" type="time" required /></label><label>料金<input name="basePrice" type="number" min="1" required /></label></div>
        <div><label>快眠スコア<input name="sleepScore" type="number" min="0" max="100" required /></label><label>定時率（%）<input name="onTimeRate" type="number" min="0" max="100" step="0.1" required /></label><label>予約提携URL<input name="bookingUrl" type="url" placeholder="https://..." /></label></div>
        <button>便を登録する</button>
      </form>
      {message && <p className="admin-message" role="status">{message}</p>}
      <div className="service-list"><h2>登録済みの便</h2>{services.map((service) => <form key={service.id} onSubmit={(event) => { event.preventDefault(); update(service, event.currentTarget); }}><header><div><small>{service.routeName}・{service.operatorName}</small><b>{service.serviceName}</b><span>{service.departureTime} → {service.arrivalTime}</span></div><a href={`/go/${service.id}?source=admin-preview`} target="_blank">送客テスト ↗</a></header><div><label>料金<input name="basePrice" type="number" defaultValue={service.basePrice} /></label><label>快眠<input name="sleepScore" type="number" defaultValue={service.sleepScore} /></label><label>定時率<input name="onTimeRate" type="number" step="0.1" defaultValue={service.onTimeRate} /></label><label>予約URL<input name="bookingUrl" type="url" defaultValue={service.bookingUrl || ""} /></label><button>更新</button></div></form>)}</div>
    </>
  );
}
