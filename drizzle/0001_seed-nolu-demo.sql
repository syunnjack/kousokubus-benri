INSERT OR IGNORE INTO routes (
  id, origin_name, destination_name, origin_code, destination_code, active, created_at
) VALUES (
  'route-tokyo-osaka', '東京', '大阪', 'TYO', 'OSA', 1, 1784779200000
);

INSERT OR IGNORE INTO services (
  id, route_id, operator_name, service_name, departure_time, arrival_time,
  seat_type, base_price, sleep_score, on_time_rate, booking_url, updated_at
) VALUES
  ('service-grandream-7', 'route-tokyo-osaka', 'JRバス', 'グランドリーム 7号', '22:50', '06:30', '独立3列', 6200, 92, 0.89, NULL, 1784779200000),
  ('service-willer-reborn', 'route-tokyo-osaka', 'WILLER EXPRESS', 'WILLER ReBorn', '23:10', '07:05', 'シェル型', 8900, 97, 0.86, NULL, 1784779200000),
  ('service-kb-113', 'route-tokyo-osaka', '千葉みらい観光', 'KBライナー 113便', '23:30', '07:20', '4列ゆったり', 3900, 71, 0.82, NULL, 1784779200000);

INSERT OR IGNORE INTO reviews (
  id, service_id, visitor_id, display_name, rating, sleep_rating,
  punctuality_rating, comfort_rating, body, ride_date, verified_ride,
  helpful_count, status, created_at
) VALUES
  ('review-demo-1', 'service-grandream-7', 'seed:mio', 'mio_旅', 5, 5, 5, 5, '首元の支えが想像以上。翌朝の予定を入れても大丈夫でした。車内も静かでよく眠れました。', '2026-07-18', 1, 128, 'published', 1784419200000),
  ('review-demo-2', 'service-grandream-7', 'seed:weekend', '週末トラベラー', 4, 4, 5, 4, '到着場所から朝風呂まで徒歩6分。到着後ルートの案内が地味に助かりました。', '2026-07-12', 1, 94, 'published', 1783900800000),
  ('review-demo-3', 'service-grandream-7', 'seed:nana', 'nana', 5, 5, 4, 5, '女性エリアで安心。カーテンの遮光性まで比較できたのが決め手になりました。', '2026-07-05', 1, 77, 'published', 1783296000000);
