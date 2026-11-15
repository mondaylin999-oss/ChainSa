"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
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

  useEffect(() => {
    if (!focusRegion || townshipData) return;
    const controller = new AbortController();
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
      });
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
  const padding = selectedTownshipId ? 1.8 : 18;
  const viewBox = focusedBounds
    ? `${focusedBounds.minX - padding} ${focusedBounds.minY - padding} ${Math.max(padding * 2, focusedBounds.maxX - focusedBounds.minX + padding * 2)} ${Math.max(padding * 2, focusedBounds.maxY - focusedBounds.minY + padding * 2)}`
    : COUNTRY_VIEWBOX;


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

  return (
    <div className="map-interactive-wrapper" data-focused={focusRegion}>
      <svg
        className="myanmar-map"
        viewBox={viewBox}
        style={{ "--map-zoom": zoom } as CSSProperties}
        role="img"
        aria-labelledby="myanmar-map-title myanmar-map-desc"
      >
        <title id="myanmar-map-title">Myanmar — States and Regions</title>
        <desc id="myanmar-map-desc">
          Select a state or region to focus the map and view its representative observation point.
        </desc>
        <defs>
          <filter id="map-active-glow" x="-30%" y="-30%" width="160%" height="160%">
            <feDropShadow dx="0" dy="0" stdDeviation="5" floodColor="#f5c400" floodOpacity=".6" />
            <feDropShadow dx="0" dy="0" stdDeviation="12" floodColor="#ffd800" floodOpacity=".34" />
          </filter>
        </defs>
        <g className="map-zoom-layer" transform={zoomTransform}>
          <text x="100" y="338" className="map-neighbor-label">INDIA</text>
          <text x="148" y="235" className="map-neighbor-label">BANGLADESH</text>
          <text x="318" y="63" className="map-neighbor-label">CHINA</text>
          <text x="470" y="351" className="map-neighbor-label">LAOS</text>
          <text x="450" y="545" className="map-neighbor-label">THAILAND</text>

          <g aria-label="State and region boundaries">
            {orderedFeatures.map(feature => {
              const featureRegion = REGIONS.find(item => item.iso === feature.properties.iso);
              const active = featureRegion?.id === selectedRegionId;
              return (
                <path
                  key={feature.properties.iso}
                  d={geometryPolygons(feature.geometry).map(polygonPath).join(" ")}
                  fill={active ? "#ffd400" : "#fdfdfc"}
                  stroke={active ? "#8a6d00" : "#6d7b71"}
                  strokeWidth={active ? 1.9 : 1.15}
                  vectorEffect="non-scaling-stroke"
                  filter={active ? "url(#map-active-glow)" : undefined}
                  fillRule="evenodd"
                  className={`${onSelectRegion ? "map-region-selectable" : ""}${active ? " map-region-active" : ""}`.trim()}
                  role={onSelectRegion && featureRegion ? "button" : undefined}
                  tabIndex={onSelectRegion && featureRegion ? 0 : undefined}
                  aria-label={featureRegion ? `${featureRegion.name} ${featureRegion.type} — regional reference point` : feature.properties.name}
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

          <g aria-label="Township boundaries">
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
              const fontSize = Math.min(viewWidth / 48, (bounds.maxY - bounds.minY) / (lines.length + 1.5));
              const labelWidth = Math.max(fontSize, (bounds.maxX - bounds.minX) * .85);
              return (
                <g key={township.id}>
                  <path
                    d={geometryPolygons(feature.geometry).map(polygonPath).join(" ")}
                    fill={selected ? "#ffd400" : "#fdfdfc"}
                    stroke={selected ? "#8a6d00" : "#7f8a82"}
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
                  <text
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
                        textLength={line.length * fontSize * (language === "my" ? .85 : .58) > labelWidth ? labelWidth : undefined}
                        lengthAdjust="spacingAndGlyphs"
                      >{line}</tspan>
                    ))}
                  </text>
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
          <button className="text-button" onClick={() => onSelectRegion?.("")}>All regions</button>
          {selectedTownshipId && <button className="text-button" onClick={() => onSelectTownship?.("")}>All townships in {region?.name}</button>}
          <small>MIMU PCode 9.4 · Township boundaries</small>
        </div>
      )}
      {townshipError && <p role="alert">Township outlines could not load. Use the township selector.</p>}
    </div>
  );
}
