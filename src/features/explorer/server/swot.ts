import "server-only";
import { TtlCache } from "@/features/earthlens-chat/server/cache";
import { ProviderError, fetchJson, isRecord } from "./http";

/**
 * NASA SWOT river and lake-on-river observations (SWOT_L2_HR_RiverSP, version D) — free, no login:
 * - Reaches near a point: NASA Earthdata GIS feature service (bounding-box query on SWOT reach observations).
 * - Time series: NASA PO.DAAC Hydrocron API.
 * Reach identifiers come from the SWOT River Database (SWORD). SWOT samples a reach only when the satellite
 * passes over it (typically several times per 21-day cycle), so series are irregular and are never interpolated.
 */
export const EGIS_REACH_URL = "https://gis.earthdata.nasa.gov/portal/rest/services/C3233944997_POCLOUD/SWOT_L2_HR_RiverSP_reach_vD_Attributes/FeatureServer/1/query";
export const HYDROCRON_URL = "https://soto.podaac.earthdatacloud.nasa.gov/hydrocron/v1/timeseries";
export const SWOT_START = "2023-07-26"; // start of the SWOT science orbit
const FILL = -999999999999;
const TIMEOUT_MS = 60_000;
/** Search box half-size in degrees, and the maximum reach distance actually accepted. */
const SEARCH_DEG = 0.15;
export const MAX_REACH_KM = 16;

export type SwotVariable = "wse" | "width" | "slope" | "dschg_c" | "area_total";
export const SWOT_DATASETS: Record<string, { variable: SwotVariable; reachType: "river" | "lake-on-river"; unit: string; scale?: number }> = {
  "river-water-surface-elevation": { variable: "wse", reachType: "river", unit: "m" },
  "river-width": { variable: "width", reachType: "river", unit: "m" },
  "river-surface-slope": { variable: "slope", reachType: "river", unit: "cm/km", scale: 1e5 }, // m/m → cm/km
  "river-discharge": { variable: "dschg_c", reachType: "river", unit: "m³/s" },
  "reservoir-surface-area": { variable: "area_total", reachType: "lake-on-river", unit: "km²", scale: 1e-6 }, // m² → km²
};

export interface SwotReach { reachId: string; riverName: string | null; distanceKm: number; type: "river" | "lake-on-river" }
export interface SwotObservation { date: string; value: number | null; time: string; quality: number | null }

const reachCache = new TtlCache<SwotReach | null>(24 * 3600_000, 300);
const seriesCache = new TtlCache<SwotRow[]>(6 * 3600_000, 300);

/** SWORD reach type is the last digit of the reach ID: 1 river, 3 lake on river, 4 dam/waterfall, 5 unreliable, 6 ghost. */
export function reachType(reachId: string): "river" | "lake-on-river" | "other" {
  const t = reachId.at(-1);
  return t === "1" ? "river" : t === "3" ? "lake-on-river" : "other";
}

function distanceKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const r = Math.PI / 180, dLat = (lat2 - lat1) * r, dLon = (lon2 - lon1) * r;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * r) * Math.cos(lat2 * r) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(a));
}

/** Distance from a point to the nearest vertex of a GeoJSON (Multi)LineString. */
function geometryDistance(geometry: unknown, lat: number, lon: number): number | undefined {
  if (!isRecord(geometry) || !Array.isArray(geometry.coordinates)) return undefined;
  const lines = geometry.type === "MultiLineString" ? geometry.coordinates as unknown[] : [geometry.coordinates];
  let best: number | undefined;
  for (const line of lines) if (Array.isArray(line)) for (const p of line) {
    if (Array.isArray(p) && typeof p[0] === "number" && typeof p[1] === "number") {
      const d = distanceKm(lat, lon, p[1], p[0]);
      if (best === undefined || d < best) best = d;
    }
  }
  return best;
}

/** Choose the nearest reach of the requested SWORD type from GeoJSON features. */
export function nearestReach(payload: unknown, lat: number, lon: number, type: "river" | "lake-on-river"): SwotReach | null {
  if (!isRecord(payload) || !Array.isArray(payload.features)) throw new ProviderError("NASA's SWOT reach service returned an unreadable response.");
  let best: SwotReach | null = null;
  for (const f of payload.features) {
    if (!isRecord(f) || !isRecord(f.properties)) continue;
    const id = String(f.properties.reach_id ?? "");
    if (!/^\d{11}$/.test(id) || reachType(id) !== type) continue;
    const d = geometryDistance(f.geometry, lat, lon);
    // The square search box reaches further at its corners; only accept reaches within MAX_REACH_KM.
    if (d === undefined || d > MAX_REACH_KM) continue;
    if (!best || d < best.distanceKm) {
      const name = typeof f.properties.river_name === "string" && f.properties.river_name !== "no_data" ? f.properties.river_name : null;
      best = { reachId: id, riverName: name, distanceKm: Number(d.toFixed(1)), type };
    }
  }
  return best;
}

export async function findNearestReach(lat: number, lon: number, type: "river" | "lake-on-river", fetchImpl: typeof fetch = fetch): Promise<SwotReach | null> {
  const key = `${type}:${lat.toFixed(3)},${lon.toFixed(3)}`;
  const hit = reachCache.get(key);
  if (hit !== undefined) return hit;
  const q = new URLSearchParams({
    where: type === "lake-on-river" ? "reach_id LIKE '%3'" : "reach_id LIKE '%1'",
    outFields: "reach_id,river_name", returnGeometry: "true", f: "geojson", resultRecordCount: "2000",
    geometry: `${lon - SEARCH_DEG},${lat - SEARCH_DEG},${lon + SEARCH_DEG},${lat + SEARCH_DEG}`,
    geometryType: "esriGeometryEnvelope", inSR: "4326", outSR: "4326", spatialRel: "esriSpatialRelIntersects",
  });
  const reach = nearestReach(await fetchJson(`${EGIS_REACH_URL}?${q}`, { provider: "NASA Earthdata GIS (SWOT reaches)", timeoutMs: TIMEOUT_MS, fetchImpl }), lat, lon, type);
  reachCache.set(key, reach);
  return reach;
}

export interface SwotRow { time: string; wse: number | null; width: number | null; slope: number | null; dschg_c: number | null; area_total: number | null; reach_q: number | null; partial_f: number | null; ice_clim_f: number | null; river_name: string | null }
const FIELDS = ["reach_id", "time_str", "wse", "width", "slope", "dschg_c", "area_total", "reach_q", "partial_f", "ice_clim_f", "river_name"];

const num = (s: string | undefined) => {
  if (s === undefined || s === "") return null;
  const n = Number(s);
  return Number.isFinite(n) && n > FILL / 10 && n !== -999 ? n : null;
};

/** Parse a Hydrocron CSV payload; `no_data` passes (satellite did not observe) are dropped. */
export function parseHydrocron(payload: unknown): SwotRow[] {
  if (!isRecord(payload) || !isRecord(payload.results) || typeof payload.results.csv !== "string") throw new ProviderError("NASA Hydrocron returned an unreadable response.");
  const [header, ...lines] = payload.results.csv.trim().split("\n");
  const cols = header.split(",");
  const at = (cells: string[], name: string) => cells[cols.indexOf(name)];
  return lines.map(line => line.split(",")).filter(c => /^\d{4}-\d{2}-\d{2}T/.test(at(c, "time_str") ?? "")).map(c => ({
    time: at(c, "time_str"), wse: num(at(c, "wse")), width: num(at(c, "width")), slope: num(at(c, "slope")), dschg_c: num(at(c, "dschg_c")),
    area_total: num(at(c, "area_total")), reach_q: num(at(c, "reach_q")), partial_f: num(at(c, "partial_f")), ice_clim_f: num(at(c, "ice_clim_f")),
    river_name: at(c, "river_name") && at(c, "river_name") !== "no_data" ? at(c, "river_name") : null,
  })).sort((a, b) => a.time.localeCompare(b.time));
}

export async function fetchReachSeries(reachId: string, start: string, end: string, fetchImpl: typeof fetch = fetch): Promise<SwotRow[]> {
  const key = `${reachId}:${start}:${end}`;
  const hit = seriesCache.get(key);
  if (hit) return hit;
  const q = new URLSearchParams({ feature: "Reach", feature_id: reachId, start_time: `${start}T00:00:00Z`, end_time: `${end}T23:59:59Z`, output: "csv", fields: FIELDS.join(",") });
  let rows: SwotRow[];
  try {
    rows = parseHydrocron(await fetchJson(`${HYDROCRON_URL}?${q}`, { provider: "NASA PO.DAAC Hydrocron", timeoutMs: TIMEOUT_MS, fetchImpl }));
  } catch (error) {
    // Hydrocron answers HTTP 400 "not found" when the reach has no passes in the period: that is no data, not a failure.
    if (error instanceof ProviderError && /HTTP 400/.test(error.message)) rows = [];
    else throw error;
  }
  seriesCache.set(key, rows);
  return rows;
}

/**
 * Quality rule: keep passes with reach_q 0–2 (good, suspect, degraded); drop reach_q 3 (bad), partially observed
 * reaches (partial_f = 1) and ice-affected passes (ice_clim_f ≥ 1). Passes on the same UTC day are averaged.
 */
export function swotObservations(rows: SwotRow[], datasetId: string): { observations: SwotObservation[]; excluded: number; passes: number } {
  const spec = SWOT_DATASETS[datasetId];
  let excluded = 0;
  const byDay = new Map<string, { values: number[]; time: string; quality: number | null }>();
  for (const r of rows) {
    const good = r.reach_q !== null && r.reach_q <= 2 && r.partial_f !== 1 && !(r.ice_clim_f !== null && r.ice_clim_f >= 1);
    const raw = r[spec.variable];
    const day = r.time.slice(0, 10);
    const entry = byDay.get(day) ?? { values: [], time: r.time, quality: r.reach_q };
    if (good && raw !== null) entry.values.push(raw * (spec.scale ?? 1));
    else excluded++;
    entry.quality = entry.quality === null ? r.reach_q : Math.min(entry.quality, r.reach_q ?? entry.quality);
    byDay.set(day, entry);
  }
  const observations = [...byDay].map(([date, e]) => ({
    date, time: e.time, quality: e.quality,
    value: e.values.length ? Number((e.values.reduce((s, v) => s + v, 0) / e.values.length).toPrecision(6)) : null,
  }));
  return { observations, excluded, passes: rows.length };
}
