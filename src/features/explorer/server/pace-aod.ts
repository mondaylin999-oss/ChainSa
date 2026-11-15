import "server-only";
import { TtlCache } from "@/features/earthlens-chat/server/cache";
import { ProviderError, fetchJson, isRecord } from "./http";

/**
 * NASA PACE OCI Level-3 mapped aerosol optical depth at 550 nm (product AER_UAA, version 3.1, 8-day composites,
 * 0.1° grid), read from NASA Earthdata GIS (GES DISC image service) — free, no login.
 * The L3M product bins only retrievals that pass the AER_UAA algorithm's own quality screening; cloudy or
 * unretrieved cells have no value and are reported as missing, never as zero.
 */
export const PACE_AOD_URL = "https://gis.earthdata.nasa.gov/portal/rest/services/GESDISC/PACE_OCI_L3M_AOD/ImageServer";
export const PACE_AOD_START = "2024-03-05";
const TIMEOUT_MS = 60_000;
const cache = new TtlCache<{ date: string; value: number | null }[]>(6 * 3600_000, 200);

const dayMs = 86_400_000;
const isoDay = (ms: number) => new Date(ms).toISOString().slice(0, 10);

/** Parse getSamples output: one sample per 8-day composite, dated by the composite's first day. */
export function parseAodSamples(payload: unknown, start: string, end: string) {
  if (!isRecord(payload)) throw new ProviderError("NASA PACE AOD service returned an unreadable response.");
  if (isRecord(payload.error)) {
    // The service reports "no resource" when no composite exists for the period: that is no data.
    if (/No resource could be found/i.test(JSON.stringify(payload.error))) return [];
    throw new ProviderError("NASA PACE AOD service could not return samples. Try again shortly.");
  }
  if (!Array.isArray(payload.samples)) throw new ProviderError("NASA PACE AOD service returned an unreadable response.");
  const byDate = new Map<string, number | null>();
  for (const s of payload.samples) {
    if (!isRecord(s) || !isRecord(s.attributes) || typeof s.attributes.stdtime !== "number") continue;
    const date = isoDay(s.attributes.stdtime);
    if (date < start || date > end) continue;
    const v = typeof s.value === "string" ? Number(s.value) : NaN;
    // AOD at 550 nm is physically non-negative; the product's mapped range is 0–1 for display, but values >1 are valid.
    byDate.set(date, Number.isFinite(v) && v >= 0 && v < 10 ? Number(v.toFixed(3)) : null);
  }
  return [...byDate].map(([date, value]) => ({ date, value })).sort((a, b) => a.date.localeCompare(b.date));
}

export async function fetchPaceAod(lat: number, lon: number, start: string, end: string, fetchImpl: typeof fetch = fetch) {
  const key = `${lat.toFixed(3)},${lon.toFixed(3)}:${start}:${end}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const q = new URLSearchParams({
    geometry: JSON.stringify({ x: lon, y: lat, spatialReference: { wkid: 4326 } }), geometryType: "esriGeometryPoint",
    returnFirstValueOnly: "false", outFields: "StdTime", f: "json",
    time: `${Date.parse(`${start}T00:00:00Z`)},${Date.parse(`${end}T00:00:00Z`) + dayMs - 1}`,
  });
  const observations = parseAodSamples(await fetchJson(`${PACE_AOD_URL}/getSamples?${q}`, { provider: "NASA Earthdata GIS (PACE OCI AOD)", timeoutMs: TIMEOUT_MS, fetchImpl }), start, end);
  cache.set(key, observations);
  return observations;
}
