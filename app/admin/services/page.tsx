import { requireChatGPTUser } from "../../chatgpt-auth";
import { isNoluAdmin } from "../../admin-auth";
import { getD1 } from "../../../db/d1";
import { ServiceManager } from "./service-manager";

export const dynamic = "force-dynamic";

export default async function AdminServicesPage() {
  const user = await requireChatGPTUser("/admin/services");
  if (!isNoluAdmin(user)) return <main className="admin-page"><section><h1>アクセスできません</h1></section></main>;
  const result = await getD1().prepare(`SELECT s.id, r.origin_name || ' → ' || r.destination_name AS routeName, s.operator_name AS operatorName, s.service_name AS serviceName, s.departure_time AS departureTime, s.arrival_time AS arrivalTime, s.base_price AS basePrice, s.sleep_score AS sleepScore, ROUND(s.on_time_rate * 100, 1) AS onTimeRate, s.booking_url AS bookingUrl FROM services s JOIN routes r ON r.id = s.route_id ORDER BY r.origin_name, s.base_price`).all();
  return <main className="admin-page"><header><a className="brand" href="/"><span>N</span>NOLU</a><div><small>運営者</small><b>{user.displayName}</b></div></header><section><span className="kicker">INVENTORY</span><h1>便データ管理</h1><p>登録内容は検索結果、路線ガイド、ランキング、予約送客へ反映されます。</p><ServiceManager initialServices={result.results as never[]} /></section></main>;
}
