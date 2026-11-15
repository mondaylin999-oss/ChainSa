"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import townshipPoints from "../township-points.json";
import type { Township } from "../client/data-service";
import boundaries from "../../earthlens-chat/server/nasa/myanmar-admin1.json";
import { REGIONS } from "../../earthlens-chat/regions";

type Position = number[];
type Polygon = Position[][];
type Geometry =
  | { type: "Polygon"; coordinates: Polygon }
  | { type: "MultiPolygon"; coordinates: Polygon[] };
type BoundaryCollection = {
  features: { properties: { iso: string; name: string; TS_PCODE?: string }; geometry: Geometry }[];
};

const boundaryData = boundaries as unknown as BoundaryCollection;
const MAP_WIDTH = 620;
const MAP_HEIGHT = 700;

function project(position: Position) {
  const [longitude, latitude] = position;
  return { x: 310 + (longitude - 97) * 31.3, y: 22 + (28.5 - latitude) * 33 };
}

function geometryPolygons(geometry: Geometry): Polygon[] {
  return geometry.type === "Polygon" ? [geometry.coordinates] : geometry.coordinates;
}

function polygonPath(polygon: Polygon) {
  return polygon.map((ring) => ring.map((point, index) => {
    const { x, y } = project(point);
    return `${index ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ") + " Z").join(" ");
}

function featureBounds(geometry: Geometry) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const polygon of geometryPolygons(geometry)) {
    for (const ring of polygon) {
      for (const position of ring) {
        const { x, y } = project(position);
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }
  }
  return { minX, minY, maxX, maxY };
}

/** Bounding box of every state and region, so the resting view hugs the country. */
const COUNTRY_BOUNDS = (() => {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const feature of boundaryData.features) {
    const bounds = featureBounds(feature.geometry);
    minX = Math.min(minX, bounds.minX);
    minY = Math.min(minY, bounds.minY);
    maxX = Math.max(maxX, bounds.maxX);
    maxY = Math.max(maxY, bounds.maxY);
  }
  return { minX, minY, maxX, maxY };
})();
// Height is the usual limit, so pad the sides more than the top and bottom.
const COUNTRY_PAD_X = 70;
const COUNTRY_PAD_Y = 12;
const COUNTRY_VIEWBOX = [
  COUNTRY_BOUNDS.minX - COUNTRY_PAD_X,
  COUNTRY_BOUNDS.minY - COUNTRY_PAD_Y,
  COUNTRY_BOUNDS.maxX - COUNTRY_BOUNDS.minX + COUNTRY_PAD_X * 2,
  COUNTRY_BOUNDS.maxY - COUNTRY_BOUNDS.minY + COUNTRY_PAD_Y * 2,
].map((value) => value.toFixed(1)).join(" ");

interface MyanmarMapProps {
  selectedRegionId?: string;
  onSelectRegion?: (id: string) => void;
  language?: "en" | "my";
  focusRegion?: boolean;
  townships?: Township[];
  selectedTownshipId?: string;
  onSelectTownship?: (id: string) => void;
}

export function MyanmarMap({
  selectedRegionId,
  onSelectRegion,
  language = "en",
  focusRegion = false,
  townships = [],
  selectedTownshipId,
  onSelectTownship,
}: MyanmarMapProps) {
  const [townshipData, setTownshipData] = useState<BoundaryCollection | null>(null);
  const [townshipError, setTownshipError] = useState(false);
  const [townshipLoading, setTownshipLoading] = useState(false);
  const t = (en: string, my: string) => language === "my" ? my : en;
  const mapSurface = useRef<SVGSVGElement>(null);
  const [manualZoom, setManualZoom] = useState({ key: "", factor: 1 });
  const [pan, setPan] = useState({ key: "", x: 0, y: 0 });
  const drag = useRef<{ pointerId: number; startX: number; startY: number; panX: number; panY: number; moved: boolean } | null>(null);
  const suppressClick = useRef(false);
  const selectionKey = `${selectedRegionId ?? ""}:${selectedTownshipId ?? ""}:${focusRegion}`;
  const zoomFactor = manualZoom.key === selectionKey ? manualZoom.factor : 1;
  function changeZoom(multiplier: number) {
    setManualZoom({ key: selectionKey, factor: Math.min(4, Math.max(0.5, zoomFactor * multiplier)) });
  }

  // Capture zoom gestures only on the map surface, never on the page or panels.
  useEffect(() => {
    const surface = mapSurface.current;
    if (!surface) return;
    let pinchDistance: number | undefined;
    const applyZoom = (multiplier: number) => setManualZoom(previous => ({
      key: selectionKey,
      factor: Math.min(4, Math.max(0.5, (previous.key === selectionKey ? previous.factor : 1) * multiplier)),
    }));
    const wheel = (event: WheelEvent) => {
      event.preventDefault();
      const delta = event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? surface.clientHeight : 1);
      applyZoom(Math.exp(-Math.max(-100, Math.min(100, delta)) * .002));
    };
    const distance = (touches: TouchList) => Math.hypot(touches[0].clientX - touches[1].clientX, touches[0].clientY - touches[1].clientY);
    const startPinch = (event: TouchEvent) => {
      pinchDistance = event.touches.length === 2 ? distance(event.touches) : undefined;
      if (event.touches.length === 2) event.preventDefault();
    };
    const movePinch = (event: TouchEvent) => {
      if (event.touches.length !== 2) return;
      event.preventDefault();
      const next = distance(event.touches);
      if (pinchDistance && next > 0) applyZoom(next / pinchDistance);
      pinchDistance = next;
    };
    surface.addEventListener("wheel", wheel, { passive: false });
    surface.addEventListener("touchstart", startPinch, { passive: false });
    surface.addEventListener("touchmove", movePinch, { passive: false });
    surface.addEventListener("touchend", startPinch, { passive: false });
    surface.addEventListener("touchcancel", startPinch, { passive: false });
    return () => {
      surface.removeEventListener("wheel", wheel);
      surface.removeEventListener("touchstart", startPinch);
      surface.removeEventListener("touchmove", movePinch);
      surface.removeEventListener("touchend", startPinch);
      surface.removeEventListener("touchcancel", startPinch);
    };
  }, [selectionKey]);

  useEffect(() => {
    if (!focusRegion || townshipData) return;
    const controller = new AbortController();
    setTownshipLoading(true);
    setTownshipError(false);
    fetch("/township-boundaries.geojson", { signal: controller.signal })
      .then(response => {
        if (!response.ok) throw new Error("Boundary data unavailable");
        return response.json();
      })
      .then(data => {
        setTownshipData(data);
        setTownshipError(false);
      })
      .catch(() => {
        if (!controller.signal.aborted) setTownshipError(true);
      }).finally(() => { if (!controller.signal.aborted) setTownshipLoading(false); });
    return () => controller.abort();
  }, [focusRegion, townshipData]);

  const region = REGIONS.find(item => item.id === selectedRegionId);
  const visibleTownships = useMemo(() => {
    const ids = new Set(townships.filter(item => item.regionId === selectedRegionId).map(item => item.id));
    return focusRegion ? townshipData?.features.filter(feature => ids.has(feature.properties.TS_PCODE!)) ?? [] : [];
  }, [townships, selectedRegionId, focusRegion, townshipData]);

  const selectedFeature = boundaryData.features.find(
    feature => REGIONS.find(item => item.iso === feature.properties.iso)?.id === selectedRegionId,
  );
  const focusedFeature = visibleTownships.find(feature => feature.properties.TS_PCODE === selectedTownshipId)
    ?? (focusRegion ? selectedFeature : undefined);
  const focusedBounds = focusedFeature ? featureBounds(focusedFeature.geometry) : null;
  const shortestSide = focusedBounds ? Math.min(focusedBounds.maxX-focusedBounds.minX,focusedBounds.maxY-focusedBounds.minY) : 0;
  const padding = selectedTownshipId ? Math.max(.4, shortestSide*.08) : Math.max(3, shortestSide*.06);
  const viewBox = focusedBounds
    ? `${focusedBounds.minX - padding} ${focusedBounds.minY - padding} ${Math.max(padding * 2, focusedBounds.maxX - focusedBounds.minX + padding * 2)} ${Math.max(padding * 2, focusedBounds.maxY - focusedBounds.minY + padding * 2)}`
    : COUNTRY_VIEWBOX;
  const [viewX, viewY, viewWidth, viewHeight] = viewBox.split(" ").map(Number);
  const panKey = `${selectionKey}:${zoomFactor}`;
  const panX = pan.key === panKey ? pan.x : 0;
  const panY = pan.key === panKey ? pan.y : 0;
  const manualViewBox = [
    viewX + (viewWidth - viewWidth / zoomFactor) / 2 + panX,
    viewY + (viewHeight - viewHeight / zoomFactor) / 2 + panY,
    viewWidth / zoomFactor,
    viewHeight / zoomFactor,
  ].join(" ");

  let zoom = 1;
  let zoomTransform = "translate(0, 0) scale(1)";
  if (selectedFeature && !focusRegion) {
    const bounds = featureBounds(selectedFeature.geometry);
    const scale = Math.min(6, Math.max(1, Math.min(
      MAP_WIDTH / (bounds.maxX - bounds.minX + 22),
      MAP_HEIGHT / (bounds.maxY - bounds.minY + 22),
    )));
    const centreX = (bounds.minX + bounds.maxX) / 2;
    const centreY = (bounds.minY + bounds.maxY) / 2;
    zoomTransform = `translate(${MAP_WIDTH / 2 - centreX * scale}, ${MAP_HEIGHT / 2 - centreY * scale}) scale(${scale})`;
    zoom = scale;
  }

  const orderedFeatures = [...boundaryData.features].sort((first, second) => {
    const firstActive = REGIONS.find(item => item.iso === first.properties.iso)?.id === selectedRegionId;
    const secondActive = REGIONS.find(item => item.iso === second.properties.iso)?.id === selectedRegionId;
    return Number(firstActive) - Number(secondActive);
  });

  // Declutter labels only; every boundary remains interactive and has its full name in a tooltip.
  const occupiedLabels: Array<{left:number;right:number;top:number;bottom:number}> = [];

  return (
    <div className="map-interactive-wrapper" data-focused={focusRegion}>
      <div className="map-zoom-controls" role="group" aria-label={t("Map zoom controls", "မြေပုံ အနီးအဝေး ထိန်းချုပ်ရန်")}>
        <button type="button" aria-label={t("Zoom in", "ချဲ့ရန်")} title={t("Zoom in", "ချဲ့ရန်")} disabled={zoomFactor >= 4} onClick={() => changeZoom(1.25)}>+</button>
        <button type="button" aria-label={t("Zoom out", "ချုံ့ရန်")} title={t("Zoom out", "ချုံ့ရန်")} disabled={zoomFactor <= 0.5} onClick={() => changeZoom(0.8)}>−</button>
        <button type="button" aria-label={t("Reset map zoom", "မြေပုံ အနီးအဝေး မူလအတိုင်း ပြန်ထားရန်")} title={t("Reset zoom", "မူလအတိုင်း ပြန်ထားရန်")} onClick={() => setManualZoom({ key: selectionKey, factor: 1 })}>↺</button>
      </div>
      <svg
        ref={mapSurface}
        className="myanmar-map"
        viewBox={manualViewBox}
        preserveAspectRatio={focusedBounds ? "xMidYMid slice" : "xMidYMid meet"}
        style={{ "--map-zoom": zoom } as CSSProperties}
        role="img"
        aria-labelledby="myanmar-map-title myanmar-map-desc"
        onPointerDown={event => {
          if (event.button !== 0 || event.isPrimary === false) return;
          drag.current = { pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, panX, panY, moved: false };
        }}
        onPointerMove={event => {
          const active = drag.current;
          if (!active || active.pointerId !== event.pointerId) return;
          const dx = event.clientX - active.startX;
          const dy = event.clientY - active.startY;
          if (!active.moved && Math.hypot(dx, dy) < 4) return;
          if (!active.moved) event.currentTarget.setPointerCapture(event.pointerId);
          active.moved = true;
          const rect = event.currentTarget.getBoundingClientRect();
          setPan({ key: panKey, x: active.panX - dx * (viewWidth / zoomFactor) / rect.width, y: active.panY - dy * (viewHeight / zoomFactor) / rect.height });
        }}
        onPointerUp={event => {
          const active = drag.current;
          if (!active || active.pointerId !== event.pointerId) return;
          suppressClick.current = active.moved;
          drag.current = null;
          if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
        }}
        onPointerCancel={() => { drag.current = null; }}
        onClickCapture={event => {
          if (!suppressClick.current) return;
          event.preventDefault();
          event.stopPropagation();
          suppressClick.current = false;
        }}
      >
        <title id="myanmar-map-title">Myanmar — States and Regions</title>
        <desc id="myanmar-map-desc">
          Select a state or region to focus the map and view its representative observation point.
        </desc>
        <defs>
          <filter id="map-active-glow" x="-30%" y="-30%" width="160%" height="160%">
            <feDropShadow dx="0" dy="0" stdDeviation="2" floodColor="#ffe34d" floodOpacity=".4" />
            <feDropShadow dx="0" dy="0" stdDeviation="4" floodColor="#ffd800" floodOpacity=".15" />
          </filter>
        </defs>
        <g className="map-zoom-layer" transform={zoomTransform}>
          <text x="100" y="338" className="map-neighbor-label">INDIA</text>
          <text x="148" y="235" className="map-neighbor-label">BANGLADESH</text>
          <text x="318" y="63" className="map-neighbor-label">CHINA</text>
          <text x="470" y="351" className="map-neighbor-label">LAOS</text>
          <text x="450" y="545" className="map-neighbor-label">THAILAND</text>

          <g aria-label={t("State and region boundaries", "တိုင်းဒေသကြီးနှင့် ပြည်နယ် နယ်နိမိတ်များ")}>
            {orderedFeatures.map(feature => {
              const featureRegion = REGIONS.find(item => item.iso === feature.properties.iso);
              const active = featureRegion?.id === selectedRegionId;
              const highlighted = active && !selectedTownshipId;
              const context = Boolean(selectedRegionId) && !highlighted;
              return (
                <path
                  key={feature.properties.iso}
                  d={geometryPolygons(feature.geometry).map(polygonPath).join(" ")}
                  fill={highlighted ? "#ffe34d" : context ? "#ffffff" : "#fdfdfc"}
                  stroke={highlighted ? "#c6a42d" : context ? "#85918c" : "#6d7b71"}
                  strokeWidth={highlighted ? 1.9 : 1.15}
                  vectorEffect="non-scaling-stroke"
                  filter={highlighted ? "url(#map-active-glow)" : undefined}
                  fillRule="evenodd"
                  className={`${onSelectRegion ? "map-region-selectable" : ""}${highlighted ? " map-region-active" : context ? " map-region-context" : ""}`.trim()}
                  role={onSelectRegion && featureRegion ? "button" : undefined}
                  tabIndex={onSelectRegion && featureRegion ? 0 : undefined}
                  aria-label={featureRegion ? (language === "my" ? `${featureRegion.nameMy} — ကိုယ်စားပြုတည်နေရာ` : `${featureRegion.name} ${featureRegion.type} — regional reference point`) : feature.properties.name}
                  onClick={() => featureRegion && onSelectRegion?.(featureRegion.id)}
                  onKeyDown={event => {
                    if (featureRegion && (event.key === "Enter" || event.key === " ")) {
                      event.preventDefault();
                      onSelectRegion?.(featureRegion.id);
                    }
                  }}
                />
              );
            })}
          </g>

          <g aria-label={t("Township boundaries", "မြို့နယ် နယ်နိမိတ်များ")}>
            {visibleTownships.map(feature => {
              const township = townships.find(item => item.id === feature.properties.TS_PCODE);
              if (!township) return null;
              const selected = township.id === selectedTownshipId;
              const bounds = featureBounds(feature.geometry);
              const sample = townshipPoints.townships.find(item => item.id === township.id);
              const anchor = sample
                ? project([sample.lon, sample.lat])
                : { x: (bounds.minX + bounds.maxX) / 2, y: (bounds.minY + bounds.maxY) / 2 };
              const label = (language === "my" ? township.nameMy : township.name) || township.name;
              // Keep long names on two lines and scale lettering with the focused map.
              const words = label.split(/\s+/);
              const lines = label.length > 12 && words.length > 1
                ? [words.slice(0, Math.ceil(words.length / 2)).join(" "), words.slice(Math.ceil(words.length / 2)).join(" ")]
                : [label];
              const viewWidth = Number(viewBox.split(" ")[2]);
              const fontSize = Math.min(viewWidth / 64, viewHeight / 48) / zoomFactor;
              const labelWidth = Math.max(...lines.map(line=>line.length)) * fontSize * (language === "my" ? .8 : .58);
              const box = {left:anchor.x-labelWidth/2-fontSize,right:anchor.x+labelWidth/2+fontSize,top:anchor.y-fontSize*lines.length,bottom:anchor.y+fontSize*lines.length};
              const showLabel = selected || !occupiedLabels.some(other=>box.left<other.right&&box.right>other.left&&box.top<other.bottom&&box.bottom>other.top);
              if (showLabel && (!selectedTownshipId || selected)) occupiedLabels.push(box);
              return (
                <g key={township.id}>
                  <path
                    d={geometryPolygons(feature.geometry).map(polygonPath).join(" ")}
                    fill={selected ? "#ffe34d" : selectedTownshipId ? "#ffffff" : "transparent"}
                    className={selected ? "map-township-active" : selectedTownshipId ? "map-township-context" : undefined}
                    filter={selected ? "url(#map-active-glow)" : undefined}
                    stroke={selected ? "#c6a42d" : selectedTownshipId ? "#85918c" : "#7f8a82"}
                    strokeWidth={selected ? 1.5 : .6}
                    vectorEffect="non-scaling-stroke"
                    role="button"
                    tabIndex={0}
                    aria-label={label}
                    onClick={() => onSelectTownship?.(township.id)}
                    onKeyDown={event => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        onSelectTownship?.(township.id);
                      }
                    }}
                  >
                    <title>{label}</title>
                  </path>
                  {showLabel && (!selectedTownshipId || selected) && <text
                    x={anchor.x}
                    y={anchor.y}
                    className="map-township-label"
                    textAnchor="middle"
                    dominantBaseline="central"
                    fontSize={fontSize}
                    pointerEvents="none"
                    aria-hidden="true"
                  >
                    {lines.map((line, index) => (
                      <tspan
                        key={index}
                        x={anchor.x}
                        dy={index === 0 ? -(lines.length - 1) * fontSize * .6 : fontSize * 1.2}
                      >{line}</tspan>
                    ))}
                  </text>}
                </g>
              );
            })}
          </g>

          {!focusRegion && REGIONS.map(item => {
            const point = project([item.lon, item.lat]);
            const selected = item.id === selectedRegionId;
            const label = language === "my" ? item.nameMy : item.name;
            return (
              <g key={item.id} className="map-label" aria-hidden="true">
                {selected && <circle cx={point.x} cy={point.y} r={11 / zoom} className="map-pulse-ring" fill="none" stroke="#e8b800" strokeWidth={2 / zoom} />}
                <circle cx={point.x} cy={point.y} r={(selected ? 4.3 : 2.7) / zoom} fill={selected ? "#8a6d00" : "#55615a"} stroke="#fff" strokeWidth={1.5 / zoom} />
                {!["naypyidaw", "mandalay", "yangon"].includes(item.id) && <text x={point.x + 5 / zoom} y={point.y - 5 / zoom} className="map-region-label">{label}</text>}
              </g>
            );
          })}

          {!focusRegion && [
            { name: "Naypyidaw", lon: 96.13, lat: 19.75 },
            { name: "Mandalay", lon: 96.08, lat: 21.97 },
            { name: "Yangon", lon: 96.15, lat: 16.8 },
          ].map(city => {
            const point = project([city.lon, city.lat]);
            return (
              <g key={city.name} aria-label={city.name}>
                <circle cx={point.x} cy={point.y} r={5.2 / zoom} fill="#55615a" stroke="#fff" strokeWidth={2 / zoom} />
                <text x={point.x + 8 / zoom} y={point.y + 4 / zoom} className="map-city-label">{city.name}</text>
              </g>
            );
          })}
        </g>
      </svg>
      {focusRegion && (
        <div className="map-drilldown-actions">
          <button className="text-button" onClick={() => onSelectRegion?.("")}>{t("All regions", "တိုင်းဒေသကြီးနှင့် ပြည်နယ်အားလုံး")}</button>
          {selectedTownshipId && <button className="text-button" onClick={() => onSelectTownship?.("")}>{language === "my" ? `${region?.nameMy} ရှိ မြို့နယ်အားလုံး` : `All townships in ${region?.name}`}</button>}
          <small>MIMU PCode 9.4 · {t("Township boundaries", "မြို့နယ်နယ်နိမိတ်များ")}</small>
        </div>
      )}
      {focusRegion && townshipLoading && <p role="status">{t("Loading township boundaries…", "မြို့နယ်နယ်နိမိတ်များကို ရယူနေသည်…")}</p>}
      {focusRegion && townshipError && <p role="alert">{t("Township outlines could not load. Use the township selector.", "မြို့နယ်နယ်နိမိတ်များကို ရယူမရပါ။ မြို့နယ်ရွေးချယ်ခလုတ်ကို သုံးပါ။")}</p>}
    </div>
  );
}
