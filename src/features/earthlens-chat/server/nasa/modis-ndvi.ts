import "server-only";
import { TtlCache } from "../cache";
import { NasaError } from "./power";

/**
 * NASA MODIS vegetation greenness (NDVI) from the MOD13Q1 v061 product (Terra, 250 m, 16-day composites),
 * read through the ORNL DAAC MODIS/VIIRS Land Product Subsets REST API (free, no key).
 * Docs: https://modis.ornl.gov/data/modis_webservice.html — product: https://lpdaac.usgs.gov/products/mod13q1v061/
 *
 * NDVI is an observation of how green the vegetation is. It is NOT a crop-yield estimate and NOT a forecast.
 */

export const MODIS_BASE = "https://modis.ornl.gov/rst/api/v1";
export const MODIS_PRODUCT = "MOD13Q1";
export const NDVI_BAND = "250m_16_days_NDVI";
export const NDVI_SOURCE = {
  id: "nasa-modis-ndvi" as const,
  name: "NASA MODIS Terra Vegetation Indices MOD13Q1 v061 (NDVI, 250 m, 16-day) via ORNL DAAC",
  url: "https://lpdaac.usgs.gov/products/mod13q1v061/",
};

const FILL = -3000;
const VALID_MIN = -2000;
const VALID_MAX = 10000;
const SCALE = 0.0001;
/** ±1 km around the point ≈ 9 × 9 pixels of 231 m. */
const KM = 1;
/** Past years compared with the latest composite (the API allows 10 dates per request, so one request per year). */
export const NDVI_HISTORY_YEARS = 10;

export interface NdviComposite {
  /** First day of the 16-day composite (YYYY-MM-DD). */
  date: string;
  modisDate: string;
  /** Mean NDVI of valid pixels, or null if every pixel was missing (e.g. clouds). */
  value: number | null;
  validPixels: number;
  totalPixels: number;
}

export interface NdviSummary {
  lat: number;
  lon: number;
  windowKm: number;
  latest: NdviComposite;
  previous: NdviComposite | null;
  /** Same 16-day composite in past years (only years with a valid value). */
  history: { year: number; date: string; value: number }[];
  historyMean: number | null;
  /** Share of past years with lower NDVI than now, 0–100. Null with fewer than 5 years. */
  percentile: number | null;
  /** ok = comparison ready; pending = still loading in the background; unavailable = fewer than 5 years retrieved. */
  historyStatus: "ok" | "pending" | "unavailable";
  retrievedAt: string;
  requestUrl: string;
}

interface SubsetJson {
  subset?: { modis_date?: string; calendar_date?: string; band?: string; data?: unknown[] }[];
}

/** Parses one subset response into composites: scale factor applied, fill and out-of-range pixels dropped. */
export function parseNdviSubset(json: unknown): NdviComposite[] {
  const j = json as SubsetJson;
  if (!j || !Array.isArray(j.subset)) throw new NasaError("Unexpected MODIS NDVI response format.");
  return j.subset
    .filter((s) => s.band === NDVI_BAND && /^A\d{7}$/.test(s.modis_date ?? "") && /^\d{4}-\d{2}-\d{2}$/.test(s.calendar_date ?? ""))
    .map((s) => {
      const raw = (s.data ?? []).filter((v): v is number => typeof v === "number" && Number.isFinite(v));
      const ok = raw.filter((v) => v !== FILL && v >= VALID_MIN && v <= VALID_MAX);
      const mean = ok.length ? ok.reduce((a, b) => a + b, 0) / ok.length : null;
      return {
        date: s.calendar_date!,
        modisDate: s.modis_date!,
        value: mean === null ? null : Number((mean * SCALE).toFixed(4)),
        validPixels: ok.length,
        totalPixels: raw.length,
      };
    })
    .sort((a, b) => a.date.localeCompare(b.date));
}

/** Percent of reference values strictly below `v`, counting ties as half. */
export function percentileRank(v: number, ref: number[]): number | null {
  if (ref.length < 5) return null;
  const below = ref.filter((x) => x < v).length;
  const equal = ref.filter((x) => x === v).length;
  return Math.round(((below + equal / 2) / ref.length) * 100);
}

/** Recent composites only (history is cached separately). */
const cache = new TtlCache<NdviSummary>(12 * 60 * 60 * 1000, 100);
const datesCache = new TtlCache<{ modis_date: string; calendar_date: string }[]>(12 * 60 * 60 * 1000, 100);

/** For tests only. */
export function clearNdviCacheForTests() {
  cache.clear();
  datesCache.clear();
  historyCache.clear();
  historyInFlight.clear();
}

async function getJson(url: string, timeoutMs: number, fetchImpl: typeof fetch): Promise<unknown> {
  let res: Response;
  try {
    res = await fetchImpl(url, { signal: AbortSignal.timeout(timeoutMs), headers: { Accept: "application/json" }, cache: "no-store" });
  } catch (err) {
    const name = (err as Error)?.name;
    throw new NasaError(name === "TimeoutError" || name === "AbortError" ? "NASA MODIS (ORNL DAAC) did not respond in time." : "Could not reach NASA MODIS (ORNL DAAC).");
  }
  if (!res.ok) throw new NasaError(`NASA MODIS (ORNL DAAC) returned HTTP ${res.status}.`);
  return res.json();
}

type HistoryEntry = { year: number; date: string; value: number };
const historyCache = new TtlCache<HistoryEntry[]>(7 * 24 * 60 * 60 * 1000, 100);
const historyInFlight = new Map<string, Promise<HistoryEntry[]>>();
/** Archive requests for past years take 25–35 s at ORNL, so they get a longer timeout. */
const HISTORY_TIMEOUT_MS = 75_000;

export type HistoryMode = "wait" | "cached-only";

/**
 * Latest NDVI composite near a point, the composite before it, and the same composite in the last
 * `NDVI_HISTORY_YEARS` years.
 * - Recent composites are cached for 12 hours, past years for 7 days (they never change).
 * - historyMode "cached-only" (used by the chat) never waits for the slow past-year requests: if they
 *   are not cached yet it starts them in the background and returns `historyStatus: "pending"`.
 */
export async function fetchNdviSummary(
  lat: number,
  lon: number,
  timeoutMs: number,
  fetchImpl: typeof fetch = fetch,
  baseUrl: string = MODIS_BASE,
  historyMode: HistoryMode = "wait",
): Promise<NdviSummary> {
  const key = `${lat.toFixed(3)},${lon.toFixed(3)}`;
  const loc = `latitude=${lat.toFixed(4)}&longitude=${lon.toFixed(4)}`;
  const subset = (start: string, end: string) =>
    `${baseUrl}/${MODIS_PRODUCT}/subset?${loc}&band=${NDVI_BAND}&startDate=${start}&endDate=${end}&kmAboveBelow=${KM}&kmLeftRight=${KM}`;

  let recentPart = cache.get(key);
  if (!recentPart) {
    let dates = datesCache.get(key);
    if (!dates) {
      const d = (await getJson(`${baseUrl}/${MODIS_PRODUCT}/dates?${loc}`, timeoutMs, fetchImpl)) as { dates?: { modis_date: string; calendar_date: string }[] };
      if (!Array.isArray(d?.dates) || !d.dates.length) throw new NasaError("NASA MODIS returned no NDVI dates for this location.");
      dates = d.dates.filter((x) => /^A\d{7}$/.test(x.modis_date));
      datesCache.set(key, dates);
    }
    const lastTwo = dates.slice(-2);
    const recentUrl = subset(lastTwo[0].modis_date, lastTwo[lastTwo.length - 1].modis_date);
    const recent = parseNdviSubset(await getJson(recentUrl, timeoutMs, fetchImpl));
    const latest = recent[recent.length - 1];
    if (!latest) throw new NasaError("NASA MODIS returned no NDVI values for this location.");
    recentPart = {
      lat, lon, windowKm: KM * 2, latest, previous: recent.length > 1 ? recent[recent.length - 2] : null,
      history: [], historyMean: null, percentile: null, historyStatus: "pending",
      retrievedAt: new Date().toISOString(), requestUrl: recentUrl,
    };
    cache.set(key, recentPart);
  }
  const { latest } = recentPart;

  // Same composite (same day-of-year code) in each of the previous years.
  const hKey = `${key}:${latest.modisDate}`;
  let history = historyCache.get(hKey);
  if (!history) {
    let job = historyInFlight.get(hKey);
    if (!job) {
      const year = Number(latest.modisDate.slice(1, 5));
      const doy = latest.modisDate.slice(5);
      const years = Array.from({ length: NDVI_HISTORY_YEARS }, (_, i) => year - 1 - i);
      job = Promise.all(
        years.map(async (y) => {
          try {
            const c = parseNdviSubset(await getJson(subset(`A${y}${doy}`, `A${y}${doy}`), Math.max(timeoutMs, HISTORY_TIMEOUT_MS), fetchImpl))[0];
            return c && c.value !== null ? { year: y, date: c.date, value: c.value } : null;
          } catch {
            return null; // one missing year should not drop the whole comparison
          }
        }),
      )
        .then((list) => {
          const h = list.filter((x): x is HistoryEntry => x !== null).sort((a, b) => a.year - b.year);
          if (h.length >= 5) historyCache.set(hKey, h); // only cache a usable comparison
          return h;
        })
        .finally(() => historyInFlight.delete(hKey));
      historyInFlight.set(hKey, job);
    }
    if (historyMode === "cached-only") return { ...recentPart, historyStatus: "pending" };
    history = await job;
  }
  const values = history.map((h) => h.value);
  return {
    ...recentPart,
    history,
    historyMean: values.length ? Number((values.reduce((a, b) => a + b, 0) / values.length).toFixed(4)) : null,
    percentile: latest.value === null ? null : percentileRank(latest.value, values),
    historyStatus: values.length >= 5 ? "ok" : "unavailable",
  };
}
