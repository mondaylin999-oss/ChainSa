"use client";

import type { CSSProperties } from "react";

import boundaries from "../../earthlens-chat/server/nasa/myanmar-admin1.json";
import { REGIONS } from "../../earthlens-chat/regions";

type Position = number[];
type Polygon = Position[][];
type Geometry =
  | { type: "Polygon"; coordinates: Polygon }
  | { type: "MultiPolygon"; coordinates: Polygon[] };
type BoundaryCollection = {
  features: { properties: { iso: string; name: string }; geometry: Geometry }[];
};

const boundaryData = boundaries as unknown as BoundaryCollection;
function project(position: Position) {
  const [longitude, latitude] = position;
  return { x: 310 + (longitude - 97) * 31.3, y: 22 + (28.5 - latitude) * 33 };
}

function polygonPath(polygon: Polygon) {
  return polygon.map((ring) => ring.map((point, index) => {
    const { x, y } = project(point);
    return `${index ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ") + " Z").join(" ");
}

const MAP_WIDTH = 620;
const MAP_HEIGHT = 700;

/** Projected bounding box of a feature, used to zoom the map onto it. */
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

function geometryPolygons(geometry: Geometry): Polygon[] {
  return geometry.type === "Polygon" ? [geometry.coordinates] : geometry.coordinates;
}

interface MyanmarMapProps {
  selectedRegionId?: string;
  onSelectRegion?: (id: string) => void;
  language?: "en" | "my";
}

export function MyanmarMap({ selectedRegionId, onSelectRegion, language = "en" }: MyanmarMapProps) {
  // The selected region is drawn last so its enlarged shape overlaps its neighbours.
  const orderedFeatures = [...boundaryData.features].sort((first, second) => {
    const firstActive = REGIONS.find((item) => item.iso === first.properties.iso)?.id === selectedRegionId;
    const secondActive = REGIONS.find((item) => item.iso === second.properties.iso)?.id === selectedRegionId;
    return Number(firstActive) - Number(secondActive);
  });

  // Zoom the whole drawing onto the selected area so it appears large on the map.
  const selectedFeature = boundaryData.features.find(
    (feature) => REGIONS.find((item) => item.iso === feature.properties.iso)?.id === selectedRegionId,
  );
  let zoomTransform = "translate(0, 0) scale(1)";
  let zoom = 1;
  if (selectedFeature) {
    const { minX, minY, maxX, maxY } = featureBounds(selectedFeature.geometry);
    const padding = 22;
    const scale = Math.min(
      6,
      Math.max(1, Math.min(MAP_WIDTH / (maxX - minX + padding), MAP_HEIGHT / (maxY - minY + padding))),
    );
    const centreX = (minX + maxX) / 2;
    const centreY = (minY + maxY) / 2;
    zoomTransform = `translate(${MAP_WIDTH / 2 - centreX * scale}, ${MAP_HEIGHT / 2 - centreY * scale}) scale(${scale})`;
    zoom = scale;
  }

  return (
    <svg
      className="myanmar-map"
      viewBox="0 0 620 700"
      style={{ "--map-zoom": zoom } as CSSProperties}
      role="img"
      aria-labelledby="myanmar-map-title myanmar-map-desc"
    >
      <title id="myanmar-map-title">Myanmar — States and Regions</title>
      <desc id="myanmar-map-desc">
        A map using locally bundled Natural Earth state and region boundaries. Select a region to use its representative data point.
      </desc>
      <defs>
        <filter id="map-active-glow" x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow dx="0" dy="0" stdDeviation="5" floodColor="#f5c400" floodOpacity=".6" />
          <feDropShadow dx="0" dy="0" stdDeviation="12" floodColor="#ffd800" floodOpacity=".34" />
        </filter>
      </defs>
      <g className="map-zoom-layer" transform={zoomTransform}>
      <text x="54" y="338" className="map-neighbor-label">INDIA</text>
      <text x="148" y="235" className="map-neighbor-label">BANGLADESH</text>
      <text x="318" y="63" className="map-neighbor-label">CHINA</text>
      <text x="493" y="351" className="map-neighbor-label">LAOS</text>
      <text x="450" y="545" className="map-neighbor-label">THAILAND</text>

      <g aria-label="State and region boundaries">
        {orderedFeatures.map((feature) => {
          const region = REGIONS.find((item) => item.iso === feature.properties.iso);
          const active = region?.id === selectedRegionId;
          const paths = geometryPolygons(feature.geometry).map(polygonPath).join(" ");
          return (
            <path
              key={feature.properties.iso}
              d={paths}
              fill={active ? "#ffd400" : "#fdfdfc"}
              stroke={active ? "#8a6d00" : "#6d7b71"}
              strokeWidth={active ? 1.9 : 1.15}
              vectorEffect="non-scaling-stroke"
              filter={active ? "url(#map-active-glow)" : undefined}
              fillRule="evenodd"
              className={`${onSelectRegion ? "map-region-selectable" : ""}${active ? " map-region-active" : ""}`.trim()}
              role={onSelectRegion && region ? "button" : undefined}
              tabIndex={onSelectRegion && region ? 0 : undefined}
              aria-label={region ? `${region.name} ${region.type} — regional reference point` : feature.properties.name}
              onClick={() => region && onSelectRegion?.(region.id)}
              onKeyDown={(event) => {
                if (region && (event.key === "Enter" || event.key === " ")) {
                  event.preventDefault();
                  onSelectRegion?.(region.id);
                }
              }}
            />
          );
        })}
      </g>

      {REGIONS.map((region) => {
        const point = project([region.lon, region.lat]);
        const selected = region.id === selectedRegionId;
        const label = language === "my" ? region.nameMy : region.name;
        return (
          <g key={region.id} className="map-label" aria-hidden="true">
            {selected && <circle cx={point.x} cy={point.y} r={11 / zoom} className="map-pulse-ring" fill="none" stroke="#e8b800" strokeWidth={2 / zoom} />}
            <circle cx={point.x} cy={point.y} r={(selected ? 4.3 : 2.7) / zoom} fill={selected ? "#8a6d00" : "#55615a"} stroke="#fff" strokeWidth={1.5 / zoom} />
            {!["naypyidaw", "mandalay", "yangon"].includes(region.id) && <text x={point.x + 5 / zoom} y={point.y - 5 / zoom} className="map-region-label">{label}</text>}
          </g>
        );
      })}

      {[
        { name: "Naypyidaw", lon: 96.13, lat: 19.75 },
        { name: "Mandalay", lon: 96.08, lat: 21.97 },
        { name: "Yangon", lon: 96.15, lat: 16.8 },
      ].map((city) => {
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
  );
}
