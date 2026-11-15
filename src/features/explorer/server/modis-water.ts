import "server-only";
import { TtlCache } from "@/features/earthlens-chat/server/cache";
import { fetchSubsets, subsetWindow, type Raster } from "./modis-products";

/**
 * Surface water from NASA MODIS Terra MOD09A1 v061 surface reflectance (8-day composites, 500 m), read from the
 * free NASA ORNL DAAC point-subset service. A clear pixel is water when MNDWI = (green − SWIR1) / (green + SWIR1)
 * is above 0 (Xu 2006), using MODIS band 4 (545–565 nm) and band 6 (1628–1652 nm).
 * Clear means the state flags show no cloud, mixed cloud, cloud shadow, cirrus (beyond "small"), internal cloud
 * or snow. Cloud-covered pixels are unknown, never counted as dry land.
 */
export const WATER_PRODUCT = "MOD09A1";
export const WATER_KM = 5; // ±5 km → 21 × 21 pixels of 463 m
export const WATER_WINDOW = subsetWindow(500, WATER_KM);
export const PIXEL_KM2 = Number(((463.313 * 463.313) / 1e6).toFixed(4)); // 0.2147 km²
/** A composite is reported only when at least this share of the window is clear. */
export const MIN_CLEAR_SHARE = 0.8;
/** Water in at least this share of a pixel's clear observations = persistent water; any less (but >0) = seasonal/temporary. */
export const PERSISTENT_SHARE = 0.9;
const MAX_DATES = 30;
const FILL = -28672;
const cache = new TtlCache<WaterResult>(6 * 3600_000, 200);

export type WaterPixel = 0 | 1 | null; // 0 dry, 1 water, null not clear / invalid

/** MOD09A1 500 m state flags (sur_refl_state_500m). */
export function isClear(state: unknown) {
  if (typeof state !== "number" || state === 65535) return false;
  const cloud = state & 0b11;           // bits 0–1: 0 clear
  const shadow = (state >> 2) & 1;      // bit 2
  const cirrus = (state >> 8) & 0b11;   // bits 8–9: 0 none, 1 small
  const internalCloud = (state >> 10) & 1;
  const snow = ((state >> 12) & 1) | ((state >> 15) & 1);
  return cloud === 0 && shadow === 0 && cirrus <= 1 && internalCloud === 0 && snow === 0;
}

export function classifyWater(green: unknown[], swir: unknown[], state: unknown[]): WaterPixel[] {
  return green.map((g, i) => {
    const s = swir[i];
    if (!isClear(state[i]) || typeof g !== "number" || typeof s !== "number" || g === FILL || s === FILL || g < -100 || s < -100 || g > 16000 || s > 16000) return null;
    if (g + s <= 0) return null;
    return (g - s) / (g + s) > 0 ? 1 : 0;
  });
}

export interface WaterComposite { date: string; pixels: WaterPixel[]; clearShare: number }
export interface WaterResult { composites: WaterComposite[] }

function composites(dates: { calendar_date: string }[], rasters: Raster[]): WaterComposite[] {
  const band = (date: string, name: string) => rasters.find(r => r.calendar_date === date && r.band === name)?.data;
  return dates.map(d => {
    const g = band(d.calendar_date, "sur_refl_b04"), s = band(d.calendar_date, "sur_refl_b06"), st = band(d.calendar_date, "sur_refl_state_500m");
    if (!g || !s || !st) return { date: d.calendar_date, pixels: [], clearShare: 0 };
    const pixels = classifyWater(g, s, st);
    return { date: d.calendar_date, pixels, clearShare: pixels.filter(p => p !== null).length / pixels.length };
  });
}

export async function fetchWaterComposites(lat: number, lon: number, start: string, end: string, fetchImpl: typeof fetch = fetch): Promise<WaterResult> {
  const key = `${lat.toFixed(3)},${lon.toFixed(3)}:${start}:${end}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const { dates, rasters } = await fetchSubsets(WATER_PRODUCT, lat, lon, start, end, fetchImpl, WATER_KM, MAX_DATES);
  for (const name of ["sur_refl_b04", "sur_refl_b06", "sur_refl_state_500m"]) {
    if (dates.length && !rasters.some(r => r.band === name)) throw new Error(`NASA did not include the expected ${name} band in its MOD09A1 response.`);
  }
  const result = { composites: composites(dates, rasters) };
  cache.set(key, result);
  return result;
}

/** Water area (km²) of a composite, or null when less than 80% of the window is clear. */
export function waterAreaKm2(c: WaterComposite) {
  if (!c.pixels.length || c.clearShare < MIN_CLEAR_SHARE) return null;
  return Number((c.pixels.filter(p => p === 1).length * PIXEL_KM2).toFixed(2));
}

/** Per-pixel water frequency over the period: persistent (≥90% of clear looks) vs seasonal/temporary (>0). */
export function waterPersistence(list: WaterComposite[]) {
  const n = list[0]?.pixels.length ?? 0;
  let persistent = 0, seasonal = 0, observed = 0;
  for (let i = 0; i < n; i++) {
    let clear = 0, wet = 0;
    for (const c of list) { const p = c.pixels[i]; if (p === null || p === undefined) continue; clear++; if (p === 1) wet++; }
    if (clear < 3) continue;
    observed++;
    if (wet / clear >= PERSISTENT_SHARE) persistent++;
    else if (wet > 0) seasonal++;
  }
  return { persistentKm2: Number((persistent * PIXEL_KM2).toFixed(2)), seasonalKm2: Number((seasonal * PIXEL_KM2).toFixed(2)), observedPixels: observed, pixels: n };
}

/**
 * Reference ("usual") water for flood detection: pixels that are water in at least half of their clear
 * dry-season looks (January–April) of the same year. Needs at least 3 clear looks per pixel.
 */
export function referenceWater(dry: WaterComposite[]): (0 | 1 | null)[] {
  const n = dry[0]?.pixels.length ?? 0;
  return Array.from({ length: n }, (_, i) => {
    let clear = 0, wet = 0;
    for (const c of dry) { const p = c.pixels[i]; if (p === null || p === undefined) continue; clear++; if (p === 1) wet++; }
    return clear < 3 ? null : wet / clear >= 0.5 ? 1 : 0;
  });
}

/** Area (km²) detected as water now but not water in the dry-season reference; null if too cloudy or no reference. */
export function excessWaterKm2(c: WaterComposite, reference: (0 | 1 | null)[]) {
  if (!c.pixels.length || c.clearShare < MIN_CLEAR_SHARE || reference.length !== c.pixels.length) return null;
  const known = reference.filter(r => r !== null).length / reference.length;
  if (known < MIN_CLEAR_SHARE) return null;
  let excess = 0;
  c.pixels.forEach((p, i) => { if (p === 1 && reference[i] === 0) excess++; });
  return Number((excess * PIXEL_KM2).toFixed(2));
}

/** Dry-season (January–April) composites for the given year, cached separately. */
export async function fetchDrySeason(lat: number, lon: number, year: number, fetchImpl: typeof fetch = fetch) {
  return (await fetchWaterComposites(lat, lon, `${year}-01-01`, `${year}-04-30`, fetchImpl)).composites;
}
