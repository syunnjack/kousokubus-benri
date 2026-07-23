"use client";

import { ChangeEvent, FormEvent, useState } from "react";

type Service = { id: string; routeName: string; operatorName: string; serviceName: string; departureTime: string; arrivalTime: string; basePrice: number; sleepScore: number; onTimeRate: number; bookingUrl: string | null; source: string; externalKey: string | null };
type CsvRow = Record<string, string>;

const columns = ["externalKey", "source", "originName", "destinationName", "routeSlug", "operatorName", "serviceName", "departureTime", "arrivalTime", "seatType", "basePrice", "sleepScore", "onTimeRate", "bookingUrl", "active"];
const sample = ["partner-001", "partner-a", "東京", "大阪", "tokyo-osaka", "サンプルバス", "NOLU夜行1号", "22:30", "06:40", "3列独立", "5980", "88", "94.5", "https://example.com/booking", "1"];

export function ServiceManager({ initialServices }: { initialServices: Service[] }) {
  const [services, setServices] = useState(initialServices);
  const [message, setMessage] = useState("");
  const [csvRows, setCsvRows] = useState<CsvRow[]>([]);
  const [csvName, setCsvName] = useState("");
  const [importing, setImporting] = useState(false);

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("登録中…");
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/admin/services", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(Object.fromEntries(form)) });
    const data = await response.json();
    if (!response.ok) return setMessage(data.error || "登録できませんでした。");
    setMessage("便を登録しました。ページを再読み込みすると一覧へ反映されます。");
    event.currentTarget.reset();
  }

  async function update(service: Service, form: HTMLFormElement) {
    const values = new FormData(form);
    const response = await fetch(`/api/admin/services/${service.id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(Object.fromEntries(values)) });
    const data = await response.json();
    setMessage(response.ok ? `${service.serviceName}を更新しました。` : data.error || "更新できませんでした。");
    if (response.ok) setServices((current) => current.map((item) => item.id === service.id ? { ...item, basePrice: Number(values.get("basePrice")), sleepScore: Number(values.get("sleepScore")), onTimeRate: Number(values.get("onTimeRate")), bookingUrl: String(values.get("bookingUrl") || "") || null } : item));
  }

  async function chooseCsv(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const parsed = parseCsv(await file.text());
      setCsvRows(parsed);
      setCsvName(file.name);
      setMessage(parsed.length ? `${parsed.length}件を読み込みました。内容を確認して取込を実行してください。` : "データ行がありません。");
    } catch (error) {
      setCsvRows([]);
      setMessage(error instanceof Error ? error.message : "CSVを読み込めませんでした。");
    }
  }

  async function importCsv() {
    if (!csvRows.length || importing) return;
    setImporting(true);
    setMessage("CSVを取り込み中…");
    const response = await fetch("/api/admin/import/services", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ rows: csvRows }) });
    const data = await response.json();
    const errorSummary = Array.isArray(data.errors) && data.errors.length ? ` エラー${data.errors.length}件（${data.errors.slice(0, 3).map((item: { row: number; message: string }) => `${item.row}行目: ${item.message}`).join("／")}）` : "";
    setMessage(response.ok || data.inserted || data.updated ? `新規${data.inserted || 0}件、更新${data.updated || 0}件。${errorSummary}` : data.error || errorSummary || "取り込めませんでした。");
    setImporting(false);
  }

  return (
    <>
      <section className="csv-import">
        <div>
          <span className="kicker">BULK IMPORT</span>
          <h2>CSVで便データを一括登録</h2>
          <p>提携先ごとの外部IDで照合し、同じ便は上書き更新します。最大500件。</p>
        </div>
        <div className="csv-actions">
          <a download="nolu-services-template.csv" href={`data:text/csv;charset=utf-8,%EF%BB%BF${encodeURIComponent(`${columns.join(",")}\n${sample.join(",")}\n`)}`}>テンプレートをダウンロード</a>
          <label className="file-button">CSVを選択<input type="file" accept=".csv,text/csv" onChange={chooseCsv} /></label>
          <button type="button" disabled={!csvRows.length || importing} onClick={importCsv}>{importing ? "取込中…" : `${csvRows.length || 0}件を取り込む`}</button>
        </div>
        {csvName && <small>選択中: {csvName} ／ 必須: externalKey・出発地・到着地・slug・運行会社・便名・時刻・運賃</small>}
      </section>
      <form className="service-create" onSubmit={create}>
        <h2>新しい便を個別登録</h2>
        <div><label>出発地<input name="originName" required placeholder="東京" /></label><label>到着地<input name="destinationName" required placeholder="大阪" /></label><label>路線URL用slug<input name="routeSlug" required pattern="[a-z0-9-]+" placeholder="tokyo-osaka" /></label></div>
        <div><label>運行会社<input name="operatorName" required /></label><label>便名<input name="serviceName" required /></label><label>座席タイプ<input name="seatType" placeholder="3列独立" /></label></div>
        <div><label>出発時刻<input name="departureTime" type="time" required /></label><label>到着時刻<input name="arrivalTime" type="time" required /></label><label>運賃<input name="basePrice" type="number" min="1" required /></label></div>
        <div><label>快眠スコア<input name="sleepScore" type="number" min="0" max="100" required /></label><label>定時率（%）<input name="onTimeRate" type="number" min="0" max="100" step="0.1" required /></label><label>予約・提携URL<input name="bookingUrl" type="url" placeholder="https://..." /></label></div>
        <button>便を登録する</button>
      </form>
      {message && <p className="admin-message" role="status">{message}</p>}
      <div className="service-list"><h2>登録済みの便</h2>{services.map((service) => <form key={service.id} onSubmit={(event) => { event.preventDefault(); update(service, event.currentTarget); }}><header><div><small>{service.routeName}・{service.operatorName} ／ {service.source}{service.externalKey ? `・${service.externalKey}` : ""}</small><b>{service.serviceName}</b><span>{service.departureTime} → {service.arrivalTime}</span></div><a href={`/go/${service.id}?source=admin-preview`} target="_blank">送客テスト →</a></header><div><label>運賃<input name="basePrice" type="number" defaultValue={service.basePrice} /></label><label>快眠<input name="sleepScore" type="number" defaultValue={service.sleepScore} /></label><label>定時率<input name="onTimeRate" type="number" step="0.1" defaultValue={service.onTimeRate} /></label><label>予約URL<input name="bookingUrl" type="url" defaultValue={service.bookingUrl || ""} /></label><button>更新</button></div></form>)}</div>
    </>
  );
}

function parseCsv(text: string): CsvRow[] {
  const records: string[][] = [];
  let row: string[] = [], value = "", quoted = false;
  const input = text.replace(/^\uFEFF/, "");
  for (let index = 0; index < input.length; index++) {
    const char = input[index];
    if (quoted && char === '"' && input[index + 1] === '"') { value += '"'; index++; }
    else if (char === '"') quoted = !quoted;
    else if (char === "," && !quoted) { row.push(value.trim()); value = ""; }
    else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && input[index + 1] === "\n") index++;
      row.push(value.trim()); value = "";
      if (row.some(Boolean)) records.push(row);
      row = [];
    } else value += char;
  }
  row.push(value.trim());
  if (row.some(Boolean)) records.push(row);
  if (!records.length) return [];
  const headers = records[0].map((header) => header.trim());
  const missing = columns.filter((column) => !headers.includes(column));
  if (missing.length) throw new Error(`CSVの列が不足しています: ${missing.join(", ")}`);
  if (records.length - 1 > 500) throw new Error("一度に取り込めるのは500件までです。");
  return records.slice(1).map((values) => Object.fromEntries(headers.map((header, index) => [header, values[index] || ""])));
}
