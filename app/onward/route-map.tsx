"use client";

import { useEffect, useRef } from "react";
import type { GeoPoint } from "../../lib/geocode";

export type RouteMapProps = {
  start: GeoPoint;
  end: GeoPoint;
  coordinates: [number, number][];
};

export function RouteMap({ start, end, coordinates }: RouteMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<{ remove: () => void } | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function mountMap() {
      if (!containerRef.current || cancelled) return;

      const L = (await import("leaflet")).default;
      await import("leaflet/dist/leaflet.css");

      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }

      const map = L.map(containerRef.current, { scrollWheelZoom: false });
      mapRef.current = map;

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map);

      const route = L.polyline(coordinates, {
        color: "#174c3b",
        weight: 5,
        opacity: 0.85,
      }).addTo(map);

      const startIcon = L.divIcon({
        className: "route-marker route-marker-start",
        html: '<span aria-hidden="true">A</span>',
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      });
      const endIcon = L.divIcon({
        className: "route-marker route-marker-end",
        html: '<span aria-hidden="true">B</span>',
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      });

      L.marker([start.lat, start.lng], { icon: startIcon })
        .addTo(map)
        .bindPopup(`<strong>降車地</strong><br>${escapeHtml(start.label)}`);
      L.marker([end.lat, end.lng], { icon: endIcon })
        .addTo(map)
        .bindPopup(`<strong>目的地</strong><br>${escapeHtml(end.label)}`);

      map.fitBounds(route.getBounds(), { padding: [36, 36] });
    }

    mountMap();

    return () => {
      cancelled = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [start.lat, start.lng, start.label, end.lat, end.lng, end.label, coordinates]);

  return (
    <section className="route-map-panel" aria-label="ルート地図">
      <header>
        <span className="kicker">ROUTE MAP</span>
        <h3>地図でルートを確認</h3>
      </header>
      <div ref={containerRef} className="route-map" role="img" aria-label={`${start.label}から${end.label}までのルート`} />
      <p className="route-map-note">OpenStreetMap と OSRM による概算ルートです。実際の公共交通ルートとは異なる場合があります。</p>
    </section>
  );
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
