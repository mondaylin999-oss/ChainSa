import "server-only";
import { TtlCache } from "../cache";

/** NASA POWER daily point API (no key required). https://power.larc.nasa.gov/docs/services/api/temporal/daily/ */
export const POWER_BASE = "https://power.larc.nasa.gov/api/temporal";
export const POWER_SOURCE = {
  id: "nasa-power-daily" as const,
  name: "NASA POWER (daily, AG community)",
  url: "https://power.larc.nasa.gov/docs/services/api/temporal/daily/",
};

export interface PowerPoint {
  date: string; // YYYY-MM-DD
  value: number | null; // null = missing (fill value)
}

export interface PowerResult {
  series: Record<string, PowerPoint[]>;
  units: Record<string, string>;
  requestUrl: string;
}

export class NasaError extends Error {}

const UNIT_MAP: Record<string, string> = { C: "°C", "mm/day": "mm/day", "%": "%", "m/s": "m/s", "1": "fraction (0–1)" };
const FALLBACK_UNITS: Record<string, string> = {
  PRECTOTCORR: "mm/day",
  T2M: "°C",
  T2M_MAX: "°C",
  T2M_MIN: "°C",
  RH2M: "%",
  WS10M: "m/s",
  WS10M_MAX: "m/s",
  GWETROOT: "fraction (0–1)",
};

const cache = new TtlCache<PowerResult>(6 * 60 * 60 * 1000);

/** For tests only. */
export function clearPowerCacheForTests() {
  cache.clear();
}

export const ymd = (d: string) => d.replaceAll("-", "");
export const isoDate = (yyyymmdd: string) => `${yyyymmdd.slice(0, 4)}-${yyyymmdd.slice(4, 6)}-${yyyymmdd.slice(6, 8)}`;
export function addDays(date: string, n: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export function parsePowerResponse(json: unknown, codes: string[], requestUrl: string): PowerResult {
  const j = json as {
    header?: { fill_value?: number };
    properties?: { parameter?: Record<string, Record<string, number>> };
    parameters?: Record<string, { units?: string }>;
  };
  const params = j?.properties?.parameter;
  if (!params || typeof params !== "object") throw new NasaError("Unexpected NASA POWER response format.");
  const fill = typeof j.header?.fill_value === "number" ? j.header.fill_value : -999;
  const series: Record<string, PowerPoint[]> = {};
  const units: Record<string, string> = {};
  for (const code of codes) {
    const raw = params[code] ?? {};
    series[code] = Object.keys(raw)
      .filter((k) => /^\d{8}$/.test(k))
      .sort()
      .map((k) => {
        const v = raw[k];
        const bad = typeof v !== "number" || !Number.isFinite(v) || v === fill || v <= -990;
        return { date: isoDate(k), value: bad ? null : v };
      });
    const u = j.parameters?.[code]?.units ?? "";
    units[code] = UNIT_MAP[u] ?? (u || FALLBACK_UNITS[code] || "");
  }
  return { series, units, requestUrl };
}

export async function fetchPowerDaily(
  lat: number,
  lon: number,
  codes: string[],
  start: string,
  end: string,
  timeoutMs: number,
  fetchImpl: typeof fetch = fetch,
  baseUrl: string = POWER_BASE,
): Promise<PowerResult> {
  const url =
    `${baseUrl}/daily/point?parameters=${codes.join(",")}&community=AG` +
    `&longitude=${lon.toFixed(4)}&latitude=${lat.toFixed(4)}&start=${ymd(start)}&end=${ymd(end)}&format=JSON&time-standard=UTC`;
  const hit = cache.get(url);
  if (hit) return hit;

  let res: Response;
  try {
    res = await fetchImpl(url, { signal: AbortSignal.timeout(timeoutMs), headers: { Accept: "application/json" }, cache: "no-store" });
  } catch (err) {
    const name = (err as Error)?.name;
    throw new NasaError(name === "TimeoutError" || name === "AbortError" ? "NASA POWER did not respond in time." : "Could not reach NASA POWER (network error).");
  }
  if (!res.ok) throw new NasaError(`NASA POWER returned HTTP ${res.status}.`);
  const parsed = parsePowerResponse(await res.json(), codes, url);
  cache.set(url, parsed);
  return parsed;
}
