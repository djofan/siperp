"use client";

import { useEffect, useRef } from "react";
import "maplibre-gl/dist/maplibre-gl.css";

export interface MapPoint {
  name: string;
  role: "guru" | "peserta";
  place: string;
  lat: number;
  lng: number;
}

const ROLE_COLOR = { guru: "#a8803a", peserta: "#2f8f74" } as const;
// OpenFreeMap: tile vektor gratis tanpa API key & tanpa batas (gaya Positron yang terang & minimalis).
const STYLE_URL = "https://tiles.openfreemap.org/styles/positron";

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char] ?? char);
}

/** Peta sebaran guru & peserta (MapLibre GL + OpenFreeMap). */
export function SpreadMap({ points }: { points: MapPoint[] }) {
  const container = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!container.current) return;
    let disposed = false;
    let map: import("maplibre-gl").Map | null = null;
    (async () => {
      const maplibregl = (await import("maplibre-gl")).default;
      if (disposed || !container.current) return;
      map = new maplibregl.Map({
        container: container.current,
        style: STYLE_URL,
        center: [118, -2.5],
        zoom: 3.6,
        scrollZoom: false,
        attributionControl: { compact: true },
      });
      map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
      const current = map;
      current.on("load", () => {
        current.addSource("anggota", {
          type: "geojson",
          data: {
            type: "FeatureCollection",
            features: points.map((point) => ({
              type: "Feature",
              geometry: { type: "Point", coordinates: [point.lng, point.lat] },
              properties: { name: point.name, role: point.role, place: point.place },
            })),
          },
        });
        current.addLayer({
          id: "anggota",
          type: "circle",
          source: "anggota",
          paint: {
            "circle-radius": 7,
            "circle-color": ["match", ["get", "role"], "guru", ROLE_COLOR.guru, ROLE_COLOR.peserta],
            "circle-stroke-color": "#ffffff",
            "circle-stroke-width": 2,
          },
        });
        current.on("click", "anggota", (event) => {
          const feature = event.features?.[0];
          if (!feature || feature.geometry.type !== "Point") return;
          const { name, role, place } = feature.properties as { name: string; role: string; place: string };
          new maplibregl.Popup({ closeButton: false, offset: 10 })
            .setLngLat(feature.geometry.coordinates as [number, number])
            .setHTML(`<strong>${escapeHtml(name)}</strong><br/>${role === "guru" ? "Guru" : "Peserta"}${place ? ` · ${escapeHtml(place)}` : ""}`)
            .addTo(current);
        });
        current.on("mouseenter", "anggota", () => (current.getCanvas().style.cursor = "pointer"));
        current.on("mouseleave", "anggota", () => (current.getCanvas().style.cursor = ""));
        if (points.length) {
          const bounds = new maplibregl.LngLatBounds();
          points.forEach((point) => bounds.extend([point.lng, point.lat]));
          current.fitBounds(bounds, { padding: 60, maxZoom: 11, duration: 0 });
        }
      });
    })();
    return () => {
      disposed = true;
      map?.remove();
    };
  }, [points]);

  return (
    <div className="relative overflow-hidden rounded-2xl">
      <div ref={container} className="h-[380px] w-full bg-[#f5f3ef] text-[#16211d]" role="img" aria-label="Peta sebaran guru dan peserta" />
      <div className="pointer-events-none absolute left-3 top-3 flex gap-3 rounded-full bg-white/90 px-3 py-1.5 text-xs text-[#16211d] shadow-sm">
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: ROLE_COLOR.guru }} /> Guru
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: ROLE_COLOR.peserta }} /> Peserta
        </span>
      </div>
    </div>
  );
}
