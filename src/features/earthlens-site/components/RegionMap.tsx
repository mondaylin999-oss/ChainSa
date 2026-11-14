"use client";

import { useEffect, useRef } from "react";
import type * as Leaflet from "leaflet";
import type { Map as LMap, GeoJSON as LGeoJSON, Layer, PathOptions } from "leaflet";
import type { Region } from "@/features/earthlens-chat/regions";
import type { Lang } from "@/features/earthlens-chat/types";

interface Props {
  regions: Region[];
  boundaries: GeoJSON.FeatureCollection | null;
  selectedId: string | null;
  onSelect: (id: string) => void;
  lang: Lang;
}

const STYLE = {
  inland: { color: "#3b6ea5", weight: 1, fillColor: "#132a45", fillOpacity: 0.75 },
  coastal: { color: "#3b8f9a", weight: 1, fillColor: "#123a44", fillOpacity: 0.75 },
  selected: { color: "#7cc7ff", weight: 2.5, fillColor: "#2b8fe8", fillOpacity: 0.35 },
  hover: { color: "#7cc7ff", weight: 2, fillOpacity: 0.85 },
} satisfies Record<string, PathOptions>;

const MYANMAR_BOUNDS: [[number, number], [number, number]] = [[9.6, 92.1], [28.6, 101.2]];

/** Leaflet map of Myanmar's states/regions, ported from the EarthLens demo map. Client only. */
export default function RegionMap({ regions, boundaries, selectedId, onSelect, lang }: Props) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<LMap | null>(null);
  const layer = useRef<LGeoJSON | null>(null);
  const markers = useRef<Layer[]>([]);
  const selectRef = useRef(onSelect);
  const selectedRef = useRef(selectedId);
  selectRef.current = onSelect;
  selectedRef.current = selectedId;

  const byIso = new Map(regions.map((r) => [r.iso, r]));
  const styleFor = (iso: string): PathOptions => {
    const r = byIso.get(iso);
    if (r && r.id === selectedRef.current) return STYLE.selected;
    return r?.coastal ? STYLE.coastal : STYLE.inland;
  };

  // create map once
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const L = (await import("leaflet")).default;
      if (cancelled || !el.current || map.current) return;
      const m = L.map(el.current, { zoomControl: true, attributionControl: true, minZoom: 4, maxZoom: 10, scrollWheelZoom: false });
      m.fitBounds(MYANMAR_BOUNDS);
      // No basemap tiles: free tile hosts increasingly require keys, and the dark page
      // background already gives the demo's look. Only the region boundaries are drawn.
      m.attributionControl.addAttribution("Boundaries: Natural Earth 1:10m Admin-1 (public domain)");
      map.current = m;
    })();
    return () => {
      cancelled = true;
      map.current?.remove();
      map.current = null;
      layer.current = null;
    };
  }, []);

  // boundaries + data points
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const L = (await import("leaflet")).default;
      for (let i = 0; i < 20 && !map.current && !cancelled; i++) await new Promise((r) => setTimeout(r, 50));
      const m = map.current;
      if (!m || cancelled || !boundaries) return;
      layer.current?.remove();
      markers.current.forEach((x) => x.remove());
      layer.current = L.geoJSON(boundaries, {
        style: (f) => styleFor(String(f?.properties?.iso ?? "")),
        onEachFeature: (f, l) => {
          const r = byIso.get(String(f.properties?.iso ?? ""));
          if (!r) return;
          l.bindTooltip(`${lang === "my" ? r.nameMy : r.name}${r.coastal ? " · 🌊" : ""}`, { sticky: true, className: "region-tip" });
          l.on({
            click: () => selectRef.current(r.id),
            mouseover: (e) => r.id !== selectedRef.current && (e.target as Leaflet.Path).setStyle(STYLE.hover),
            mouseout: (e) => (e.target as Leaflet.Path).setStyle(styleFor(r.iso)),
          });
        },
      }).addTo(m);
      markers.current = regions.map((r) =>
        L.circleMarker([r.lat, r.lon], { radius: 5, color: "#ffffff", weight: 1.5, fillColor: "#4aaeff", fillOpacity: 0.95 })
          .bindTooltip(`${lang === "my" ? r.nameMy : r.name} · ${r.lat.toFixed(2)}°N ${r.lon.toFixed(2)}°E`, { className: "region-tip" })
          .on("click", () => selectRef.current(r.id))
          .addTo(m),
      );
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [boundaries, lang, regions]);

  // selection highlight + zoom
  useEffect(() => {
    const m = map.current;
    const g = layer.current;
    if (!m || !g) return;
    g.eachLayer((l) => {
      const iso = String((l as unknown as { feature?: GeoJSON.Feature }).feature?.properties?.iso ?? "");
      (l as Leaflet.Path).setStyle(styleFor(iso));
    });
    const r = regions.find((x) => x.id === selectedId);
    if (!r) {
      m.flyToBounds(MYANMAR_BOUNDS, { duration: 0.6 });
      return;
    }
    let target: Leaflet.LatLngBounds | null = null;
    g.eachLayer((l) => {
      const f = (l as unknown as { feature?: GeoJSON.Feature }).feature;
      if (f?.properties?.iso === r.iso) target = (l as Leaflet.Polygon).getBounds();
    });
    if (target) m.flyToBounds(target, { padding: [30, 30], duration: 0.6 });
    else m.flyTo([r.lat, r.lon], 8, { duration: 0.6 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, boundaries]);

  return <div ref={el} className="h-full w-full" aria-label="Map of Myanmar states and regions" />;
}
