"use client";

import { useEffect, useMemo, useState } from "react";
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
// One distinct fill per state/region (admin-1), so neighbours never share a colour.
const REGION_FILLS: Record<string, string> = {
  "MM-11": "#cfe3f7", // Kachin
  "MM-01": "#e4dcf4", // Sagaing
  "MM-17": "#f7e3b2", // Shan
  "MM-14": "#d7eedb", // Chin
  "MM-04": "#f6d6c6", // Mandalay
  "MM-12": "#c9e8e4", // Kayah
  "MM-03": "#eef0c6", // Magway
  "MM-13": "#f3d2de", // Kayin
  "MM-16": "#bfe0d2", // Rakhine
  "MM-02": "#dfe6f6", // Bago
  "MM-07": "#f0e7cf", // Ayeyarwady
  "MM-06": "#f9dcb4", // Yangon
  "MM-15": "#d9e7bd", // Mon
  "MM-05": "#e8d8ef", // Tanintharyi
};
const FALLBACK_FILLS = ["#d9eddd", "#f7e9b5", "#e7dff4", "#f1e4ce", "#f5d9c8", "#dce9f2", "#e8edcc"];

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

function geometryPolygons(geometry: Geometry): Polygon[] {
  return geometry.type === "Polygon" ? [geometry.coordinates] : geometry.coordinates;
}

interface MyanmarMapProps {
  selectedRegionId?: string;
  onSelectRegion?: (id: string) => void;
  language?: "en" | "my";
  focusRegion?: boolean;
  townships?: Township[];
  selectedTownshipId?: string;
  onSelectTownship?: (id: string) => void;
}

export function MyanmarMap({ selectedRegionId, onSelectRegion, language = "en", focusRegion = false, townships = [], selectedTownshipId, onSelectTownship }: MyanmarMapProps) {
  const [townshipData,setTownshipData] = useState<BoundaryCollection | null>(null);
  const [townshipError,setTownshipError] = useState(false);
  useEffect(()=>{if(!focusRegion || townshipData)return;const controller=new AbortController();fetch("/township-boundaries.geojson",{signal:controller.signal}).then(response=>{if(!response.ok)throw Error("Boundary data unavailable");return response.json();}).then(data=>{setTownshipData(data);setTownshipError(false);}).catch(()=>{if(!controller.signal.aborted)setTownshipError(true);});return()=>controller.abort();},[focusRegion,townshipData]);
  const region = REGIONS.find(item=>item.id===selectedRegionId);
  const visibleTownships = useMemo(()=>{
    const ids=new Set(townships.filter(item=>item.regionId===selectedRegionId).map(item=>item.id));
    return focusRegion ? townshipData?.features.filter(feature=>ids.has(feature.properties.TS_PCODE!)) ?? [] : [];
  },[townships,selectedRegionId,focusRegion,townshipData]);
  function boundsFor(geometry: Geometry) {
    const points=geometryPolygons(geometry).flatMap(polygon=>polygon.flatMap(ring=>ring.map(project)));
    const xs=points.map(point=>point.x),ys=points.map(point=>point.y);
    const minX=Math.min(...xs),minY=Math.min(...ys),maxX=Math.max(...xs),maxY=Math.max(...ys);
    return {minX,minY,maxX,maxY};
  }
  const focusedFeature = visibleTownships.find(feature=>feature.properties.TS_PCODE===selectedTownshipId) ?? (focusRegion ? boundaryData.features.find(feature=>feature.properties.iso===region?.iso) : undefined);
  const focusedBounds=focusedFeature ? boundsFor(focusedFeature.geometry) : null;
  const padding=selectedTownshipId ? 1.8 : 18;
  const markerRadius=focusedBounds ? Math.max(.05, Math.max(focusedBounds.maxX-focusedBounds.minX,focusedBounds.maxY-focusedBounds.minY)/100) : .8;
  const viewBox=focusedBounds ? `${focusedBounds.minX-padding} ${focusedBounds.minY-padding} ${Math.max(padding*2,focusedBounds.maxX-focusedBounds.minX+padding*2)} ${Math.max(padding*2,focusedBounds.maxY-focusedBounds.minY+padding*2)}` : "0 0 620 700";
  return (
    <div className="map-interactive-wrapper" data-focused={focusRegion}><svg
      className="myanmar-map"
      viewBox={viewBox}
      role="img"
      aria-labelledby="myanmar-map-title myanmar-map-desc"
    >
      <title id="myanmar-map-title">Myanmar — States and Regions</title>
      <desc id="myanmar-map-desc">
        A map using locally bundled Natural Earth state and region boundaries. Select a region to use its representative data point.
      </desc>
      <defs>
        <linearGradient id="map-background" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stopColor="#edf3ee" />
          <stop offset=".52" stopColor="#edf3ee" />
          <stop offset="1" stopColor="#dcedf3" />
        </linearGradient>
        <filter id="map-active-glow" x="-25%" y="-25%" width="150%" height="150%">
          <feDropShadow dx="0" dy="0" stdDeviation="5" floodColor="#2f9f6b" floodOpacity=".55" />
          <feDropShadow dx="0" dy="0" stdDeviation="11" floodColor="#49c98a" floodOpacity=".32" />
        </filter>
      </defs>
      <rect width="620" height="700" fill="url(#map-background)" />
      <text x="54" y="338" className="map-neighbor-label">INDIA</text>
      <text x="148" y="235" className="map-neighbor-label">BANGLADESH</text>
      <text x="318" y="63" className="map-neighbor-label">CHINA</text>
      <text x="493" y="351" className="map-neighbor-label">LAOS</text>
      <text x="450" y="545" className="map-neighbor-label">THAILAND</text>

      <g aria-label="State and region boundaries">
        {boundaryData.features.map((feature, index) => {
          const region = REGIONS.find((item) => item.iso === feature.properties.iso);
          const active = region?.id === selectedRegionId;
          const paths = geometryPolygons(feature.geometry).map(polygonPath).join(" ");
          return (
            <path
              key={feature.properties.iso}
              d={paths}
              fill={REGION_FILLS[feature.properties.iso] ?? FALLBACK_FILLS[index % FALLBACK_FILLS.length]}
              stroke="#596b5d"
              strokeWidth={1.15} vectorEffect="non-scaling-stroke"
              style={focusRegion && !active ? {filter:"blur(2px)",opacity:.2} : undefined}
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

      <g aria-label="Township boundaries">
        {visibleTownships.map(feature=>{
          const township=townships.find(item=>item.id===feature.properties.TS_PCODE);if(!township)return null;
          const selected=township.id===selectedTownshipId;const bounds=boundsFor(feature.geometry);const x=(bounds.minX+bounds.maxX)/2,y=(bounds.minY+bounds.maxY)/2;
          return <g key={township.id}><path d={geometryPolygons(feature.geometry).map(polygonPath).join(" ")} fill={selected?"#8fd7a7":"transparent"} stroke="#596b5d" strokeWidth={selected?1.5:.6} vectorEffect="non-scaling-stroke" role="button" tabIndex={0} aria-label={language==="my"?township.nameMy:township.name} onClick={()=>onSelectTownship?.(township.id)} onKeyDown={event=>{if(event.key==="Enter"||event.key===" "){event.preventDefault();onSelectTownship?.(township.id);}}}><title>{language==="my"?township.nameMy:township.name}</title></path><circle cx={x} cy={y} r={selected?markerRadius*1.5:markerRadius} fill="#176b4b" pointerEvents="none"/></g>;
        })}
      </g>
      {!focusRegion && REGIONS.map((region) => {
        const point = project([region.lon, region.lat]);
        const selected = region.id === selectedRegionId;
        const label = language === "my" ? region.nameMy : region.name;
        return (
          <g key={region.id} className="map-label" aria-hidden="true">
            {selected && <circle cx={point.x} cy={point.y} r="11" className="map-pulse-ring" fill="none" stroke="#2f9f6b" strokeWidth="2" />}
            <circle cx={point.x} cy={point.y} r={selected ? 4.3 : 2.7} fill={selected ? "#176b4b" : "#26382f"} stroke="#fff" strokeWidth="1.5" />
            {!["naypyidaw", "mandalay", "yangon"].includes(region.id) && <text x={point.x + 5} y={point.y - 5} className="map-region-label">{label}</text>}
          </g>
        );
      })}

      {!focusRegion && [
        { name: "Naypyidaw", lon: 96.13, lat: 19.75 },
        { name: "Mandalay", lon: 96.08, lat: 21.97 },
        { name: "Yangon", lon: 96.15, lat: 16.8 },
      ].map((city) => {
        const point = project([city.lon, city.lat]);
        return (
          <g key={city.name} aria-label={city.name}>
            <circle cx={point.x} cy={point.y} r="5.2" fill="#df7648" stroke="#fff" strokeWidth="2" />
            <text x={point.x + 8} y={point.y + 4} className="map-city-label">{city.name}</text>
          </g>
        );
      })}
    </svg>{focusRegion && <div className="map-drilldown-actions"><button className="text-button" onClick={()=>onSelectRegion?.("")}>All regions</button>{selectedTownshipId && <button className="text-button" onClick={()=>onSelectTownship?.("")}>All townships in {region?.name}</button>}<small>MIMU PCode 9.4 · Township boundaries</small></div>}{townshipError && <p role="alert">Township outlines could not load. Use the township selector.</p>}</div>
  );
}
