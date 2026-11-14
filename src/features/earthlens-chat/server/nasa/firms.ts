import "server-only";
import { TtlCache } from "../cache";
import { NasaError } from "./power";
import admin1 from "./myanmar-admin1.json";
import type { Region } from "../../regions";

/** NASA FIRMS area API (needs a free MAP_KEY). https://firms.modaps.eosdis.nasa.gov/api/area/ */
export const FIRMS_SOURCE = {
  id: "nasa-firms-viirs" as const,
  name: "NASA FIRMS (VIIRS S-NPP, near real-time)",
  url: "https://firms.modaps.eosdis.nasa.gov/api/area/",
};

export interface FireDetection {
  lat: number;
  lon: number;
  date: string;
  time: string;
  confidence: string;
}

type Ring = number[][];
type Geometry = { type: "Polygon"; coordinates: Ring[] } | { type: "MultiPolygon"; coordinates: Ring[][] };
interface Feature { properties: { iso: string; name: string }; geometry: Geometry }

const FEATURES = (admin1 as unknown as { features: Feature[] }).features;

export function regionGeometry(iso: string): Geometry | undefined {
  return FEATURES.find((f) => f.properties.iso === iso)?.geometry;
}

function inRing(x: number, y: number, ring: Ring): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

function inPolygon(x: number, y: number, rings: Ring[]): boolean {
  if (!inRing(x, y, rings[0])) return false;
  for (let k = 1; k < rings.length; k++) if (inRing(x, y, rings[k])) return false;
  return true;
}

export function pointInGeometry(lon: number, lat: number, g: Geometry): boolean {
  return g.type === "Polygon" ? inPolygon(lon, lat, g.coordinates) : g.coordinates.some((p) => inPolygon(lon, lat, p));
}

export function bbox(g: Geometry): [number, number, number, number] {
  let w = Infinity, s = Infinity, e = -Infinity, n = -Infinity;
  const polys = g.type === "Polygon" ? [g.coordinates] : g.coordinates;
  for (const p of polys) for (const [x, y] of p[0]) { w = Math.min(w, x); e = Math.max(e, x); s = Math.min(s, y); n = Math.max(n, y); }
  return [w, s, e, n];
}

export function parseFirmsCsv(csv: string): FireDetection[] {
  const lines = csv.trim().split(/\r?\n/);
  if (lines.length < 2) return [];
  const head = lines[0].split(",").map((h) => h.trim());
  const col = (n: string) => head.indexOf(n);
  const [iLat, iLon, iDate, iTime, iConf] = ["latitude", "longitude", "acq_date", "acq_time", "confidence"].map(col);
  if (iLat < 0 || iLon < 0 || iDate < 0) throw new NasaError("Unexpected NASA FIRMS CSV header.");
  return lines
    .slice(1)
    .map((l) => l.split(","))
    .map((c) => ({ lat: Number(c[iLat]), lon: Number(c[iLon]), date: c[iDate], time: c[iTime] ?? "", confidence: c[iConf] ?? "" }))
    .filter((d) => Number.isFinite(d.lat) && Number.isFinite(d.lon) && /^\d{4}-\d{2}-\d{2}$/.test(d.date));
}

const cache = new TtlCache<FireDetection[]>(60 * 60 * 1000);

/**
 * Fire detections inside the region polygon for the last `days` days (1–10).
 * Naypyidaw has no polygon in the boundary file, so a ±0.25° box around its grid point is used.
 */
export async function fetchFires(
  region: Region,
  days: number,
  mapKey: string,
  timeoutMs: number,
  fetchImpl: typeof fetch = fetch,
): Promise<{ detections: FireDetection[]; areaNote: string }> {
  if (!mapKey) throw new NasaError("FIRMS_MAP_KEY not configured.");
  const geom = regionGeometry(region.iso);
  const box: [number, number, number, number] = geom
    ? bbox(geom)
    : [region.lon - 0.25, region.lat - 0.25, region.lon + 0.25, region.lat + 0.25];
  const areaNote = geom ? "inside the state/region boundary" : "within about 25 km of the representative grid point";
  const n = Math.min(10, Math.max(1, Math.round(days)));
  const url = `${FIRMS_SOURCE.url}csv/${encodeURIComponent(mapKey)}/VIIRS_SNPP_NRT/${box.map((v) => v.toFixed(3)).join(",")}/${n}`;
  const cacheKey = `${region.id}:${n}`; // never put the key itself in logs or cache keys
  const hit = cache.get(cacheKey);
  if (hit) return { detections: hit, areaNote };

  let res: Response;
  try {
    res = await fetchImpl(url, { signal: AbortSignal.timeout(timeoutMs), cache: "no-store" });
  } catch {
    throw new NasaError("Could not reach NASA FIRMS.");
  }
  if (!res.ok) throw new NasaError(`NASA FIRMS returned HTTP ${res.status}.`);
  const text = await res.text();
  if (!text.startsWith("latitude")) throw new NasaError("NASA FIRMS did not return fire data (check the MAP_KEY).");
  const all = parseFirmsCsv(text);
  const detections = geom ? all.filter((d) => pointInGeometry(d.lon, d.lat, geom)) : all;
  cache.set(cacheKey, detections);
  return { detections, areaNote };
}
