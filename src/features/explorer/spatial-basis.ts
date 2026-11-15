/**
 * How an observation relates to geography. Every Explore response carries one, so a single-point or
 * pixel-window result is never presented as a region-wide or township-wide value.
 */
export type SpatialKind = "point" | "pixel-window" | "grid-cell" | "river-reach" | "buffer" | "area-average" | "area-total";
export interface SpatialBasis { kind: SpatialKind; label: string }
interface Place { lat: number; lon: number; type: "township" | "region" }

const coords = (p: Place) => `${p.lat.toFixed(4)}°N, ${p.lon.toFixed(4)}°E`;

/** "Regional Reference Point (lat, lon)" or "Township Representative Point (lat, lon)". */
export function pointLabel(p: Place) {
  return `${p.type === "township" ? "Township Representative Point" : "Regional Reference Point"} (${coords(p)})`;
}
export function pointBasis(p: Place): SpatialBasis {
  return { kind: "point", label: pointLabel(p) };
}
export function windowBasis(p: Place, window: { n: number; sideKm: number }): SpatialBasis {
  return { kind: "pixel-window", label: `${pointLabel(p)} · ${window.n} × ${window.n} pixel window (about ${window.sideKm} km × ${window.sideKm} km)` };
}
export function bufferBasis(p: Place, radiusKm: number): SpatialBasis {
  return { kind: "buffer", label: `${pointLabel(p)} · ${radiusKm} km radius` };
}
/** Only for calculations that genuinely use the full township or region boundary. */
export function areaAverageBasis(township: boolean): SpatialBasis {
  return { kind: "area-average", label: township ? "Full Township Area Average" : "Full Region Area Average" };
}
export function areaTotalBasis(township: boolean, what: string): SpatialBasis {
  return { kind: "area-total", label: `${township ? "Full Township Area" : "Full Region Area"} Total (${what})` };
}
export function gridCellBasis(p: Place, cellDeg: number): SpatialBasis {
  return { kind: "grid-cell", label: `${pointLabel(p)} · ${cellDeg}° grid cell (about ${Math.round(cellDeg * 111)} km)` };
}
/** A SWOT reach is a river segment (typically about 10 km long), not an area around the point. */
export function reachBasis(p: Place, reach: { reachId: string; riverName: string | null; distanceKm: number }, lake = false): SpatialBasis {
  return { kind: "river-reach", label: `SWOT ${lake ? "lake-on-river reach" : "river reach"} ${reach.reachId}${reach.riverName ? ` (${reach.riverName})` : ""}, ${reach.distanceKm} km from the ${pointLabel(p)}` };
}
