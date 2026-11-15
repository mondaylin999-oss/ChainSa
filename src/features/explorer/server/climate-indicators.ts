import "server-only";
import { addDays, fetchPowerDaily } from "@/features/earthlens-chat/server/nasa/power";
import { percentileRank, quantile, sameDateInYear, toDailyMap, type DailyMap } from "@/features/earthlens-chat/server/climate/stats";
import { POWER_CONSISTENT_FROM, POWER_PROVISIONAL_BASELINE, powerBaselineLabel } from "@/features/earthlens-chat/server/nasa/power-homogeneity";

/**
 * Monthly extreme-weather and drought indicators from NASA POWER daily point data.
 * Thresholds follow ETCCDI climate-extremes definitions; drought uses empirical percentile bands.
 *
 * Reference period: NASA POWER's MERRA-2 record over Myanmar has a discontinuity during 2008 (see
 * power-homogeneity.ts), so the WMO 1991–2020 normal would mix inconsistent data. All thresholds,
 * percentiles and reported months use only the consistent post-break period: a provisional 17-year baseline
 * (2009–2025). It is shorter than a standard 30-year normal, so percentiles are coarser (about 6 points per
 * reference year) and the most extreme categories cannot be resolved. Every value describes the past.
 */
export const REFERENCE = POWER_PROVISIONAL_BASELINE;
export const BASELINE_LABEL = powerBaselineLabel(REFERENCE.firstYear, REFERENCE.lastYear);
/** A month needs data on at least 90% of its days; otherwise it is reported as missing, never as zero. */
const MIN_MONTH_COVERAGE = 0.9;
/** Percentiles are only reported when at least 15 of the 17 reference years have data. */
const MIN_REFERENCE_YEARS = 15;
const MAX_MONTHS = 480;
/** First month each indicator can report without using pre-2009 data (drought needs a 3-month window). */
export const FIRST_MONTH: Record<ClimateIndicatorId, string> = {
  "extreme-rainfall-frequency": POWER_CONSISTENT_FROM,
  "hot-day-frequency": POWER_CONSISTENT_FROM,
  "drought-indicators": "2009-03-01",
};
/** The full 1991–present request is large; allow longer than a short POWER request. */
export const CLIMATE_TIMEOUT_MS = 60_000;

export type ClimateIndicatorId = "extreme-rainfall-frequency" | "hot-day-frequency" | "drought-indicators";
export const CLIMATE_PARAMETERS: Record<ClimateIndicatorId, string[]> = {
  "extreme-rainfall-frequency": ["PRECTOTCORR"],
  "hot-day-frequency": ["T2M_MAX"],
  "drought-indicators": ["PRECTOTCORR", "GWETROOT"],
};

export interface MonthlyObservation {
  date: string;
  value: number | null;
  components?: { rainfall3MonthPercentile: number | null; rootZoneWetnessPercentile: number | null };
}
export interface ClimateIndicatorResult { observations: MonthlyObservation[]; method: string }

const monthStart = (date: string) => `${date.slice(0, 7)}-01`;
function monthEnd(first: string) {
  const d = new Date(`${first}T00:00:00Z`);
  d.setUTCMonth(d.getUTCMonth() + 1, 0);
  return d.toISOString().slice(0, 10);
}
function addMonths(first: string, n: number) {
  const d = new Date(`${first}T00:00:00Z`);
  d.setUTCMonth(d.getUTCMonth() + n, 1);
  return d.toISOString().slice(0, 10);
}
/** Calendar months overlapping [start, end], as YYYY-MM-01. */
export function monthsBetween(start: string, end: string) {
  const out: string[] = [];
  for (let m = monthStart(start); m <= end; m = addMonths(m, 1)) out.push(m);
  return out;
}
const inReference = (date: string) => {
  const y = Number(date.slice(0, 4));
  return y >= REFERENCE.firstYear && y <= REFERENCE.lastYear;
};

/** Days in [first, last] with data, plus whether coverage is sufficient. */
function daysWithData(map: DailyMap, first: string, last: string) {
  const values: { date: string; value: number }[] = [];
  let n = 0;
  for (let d = first; d <= last; d = addDays(d, 1)) {
    n++;
    const v = map.get(d);
    if (v !== undefined) values.push({ date: d, value: v });
  }
  return { values, complete: n > 0 && values.length / n >= MIN_MONTH_COVERAGE };
}

/** ETCCDI R95p threshold: 95th percentile of wet-day (≥ 1 mm) precipitation in the reference period. */
export function wetDayThreshold(rain: DailyMap): number | undefined {
  const wet = [...rain].filter(([d, v]) => inReference(d) && v >= 1).map(([, v]) => v);
  return wet.length >= 300 ? quantile(wet, 0.95) : undefined;
}

export function extremeRainfallDays(rain: DailyMap, months: string[]) {
  const threshold = wetDayThreshold(rain);
  const observations = months.map(m => {
    const { values, complete } = daysWithData(rain, m, monthEnd(m));
    return { date: m, value: threshold !== undefined && complete ? values.filter(v => v.value > threshold).length : null };
  });
  return { observations, threshold };
}

/**
 * ETCCDI TX90p: a day is hot when daily maximum temperature exceeds the 90th percentile of the
 * reference-period values in a 5-day window centred on the same calendar day.
 */
export function hotDayThreshold(tmax: DailyMap, date: string): number | undefined {
  const sample: number[] = [];
  for (let y = REFERENCE.firstYear; y <= REFERENCE.lastYear; y++) {
    const centre = sameDateInYear(date, y);
    for (let k = -2; k <= 2; k++) {
      const v = tmax.get(addDays(centre, k));
      if (v !== undefined) sample.push(v);
    }
  }
  return sample.length >= MIN_REFERENCE_YEARS * 5 ? quantile(sample, 0.9) : undefined;
}

export function hotDays(tmax: DailyMap, months: string[]) {
  const cache = new Map<string, number | undefined>();
  const threshold = (date: string) => {
    const key = date.slice(5);
    if (!cache.has(key)) cache.set(key, hotDayThreshold(tmax, date));
    return cache.get(key);
  };
  return months.map(m => {
    const { values, complete } = daysWithData(tmax, m, monthEnd(m));
    if (!complete) return { date: m, value: null };
    let count = 0;
    for (const v of values) {
      const t = threshold(v.date);
      if (t === undefined) return { date: m, value: null };
      if (v.value > t) count++;
    }
    return { date: m, value: count };
  });
}

/** Total over the 3 calendar months ending with `month`, or undefined when any month is incomplete. */
function threeMonthTotal(rain: DailyMap, month: string) {
  let total = 0;
  for (let k = -2; k <= 0; k++) {
    const m = addMonths(month, k);
    const { values, complete } = daysWithData(rain, m, monthEnd(m));
    if (!complete) return undefined;
    total += values.reduce((s, v) => s + v.value, 0);
  }
  return total;
}
function monthlyMean(map: DailyMap, month: string) {
  const { values, complete } = daysWithData(map, month, monthEnd(month));
  return complete ? values.reduce((s, v) => s + v.value, 0) / values.length : undefined;
}
/** Empirical percentile of `value` against the same calendar month in each reference year. */
function referencePercentile(value: number | undefined, month: string, compute: (m: string) => number | undefined) {
  if (value === undefined) return null;
  const sample: number[] = [];
  for (let y = REFERENCE.firstYear; y <= REFERENCE.lastYear; y++) {
    const v = compute(`${y}${month.slice(4)}`);
    if (v !== undefined) sample.push(v);
  }
  if (sample.length < MIN_REFERENCE_YEARS) return null;
  const p = percentileRank(value, sample);
  return p === undefined ? null : Number(p.toFixed(1));
}

/**
 * Drought blend: equal-weight mean of (a) the percentile of 3-month precipitation (an empirical SPI-3
 * analogue, meteorological drought) and (b) the percentile of monthly mean root-zone soil wetness
 * (agricultural drought), both against the same calendar month in the provisional baseline. Low values mean drier.
 */
export function droughtBlend(rain: DailyMap, soil: DailyMap, months: string[]): MonthlyObservation[] {
  return months.map(m => {
    const rainfall = referencePercentile(threeMonthTotal(rain, m), m, x => threeMonthTotal(rain, x));
    const wetness = referencePercentile(monthlyMean(soil, m), m, x => monthlyMean(soil, x));
    const value = rainfall !== null && wetness !== null ? Number(((rainfall + wetness) / 2).toFixed(1)) : null;
    return { date: m, value, components: { rainfall3MonthPercentile: rainfall, rootZoneWetnessPercentile: wetness } };
  });
}

/**
 * Provisional percentile bands. With 17 reference years one year is about 6 percentile points, so the
 * U.S. Drought Monitor's D3 (≤5) and D4 (≤2) bands cannot be resolved and are not reported.
 */
export function droughtCategory(percentile: number) {
  if (percentile === 0) return `drier than every year in the ${REFERENCE.firstYear}–${REFERENCE.lastYear} baseline`;
  if (percentile <= 10) return "severely dry (≤10th percentile)";
  if (percentile <= 20) return "moderately dry (≤20th percentile)";
  if (percentile <= 30) return "abnormally dry (≤30th percentile)";
  return "no drought signal";
}

const PERIOD_ERROR = "This indicator uses NASA POWER data from 2009 onward only";
export async function fetchClimateIndicator(id: ClimateIndicatorId, lat: number, lon: number, start: string, end: string, fetchImpl: typeof fetch = fetch, baseUrl?: string): Promise<ClimateIndicatorResult> {
  const first = FIRST_MONTH[id];
  // Never report a month that would need pre-2009 data: NASA POWER is inconsistent across 2008 in Myanmar.
  if (monthStart(start) < first) throw new ClimatePeriodError(`${PERIOD_ERROR} (first month ${first.slice(0, 7)}), because NASA POWER rainfall, soil-wetness and temperature data for Myanmar change abruptly during 2008. Choose a start date from ${first} onward.`);
  const months = monthsBetween(start, end);
  if (months.length > MAX_MONTHS) throw new ClimatePeriodError("Choose a period of at most 40 years.");
  const fetchTo = [end, `${REFERENCE.lastYear}-12-31`].sort()[1];
  const codes = CLIMATE_PARAMETERS[id];
  const result = await fetchPowerDaily(lat, lon, codes, POWER_CONSISTENT_FROM, fetchTo, CLIMATE_TIMEOUT_MS, fetchImpl, baseUrl);
  // Defensive: drop anything before the consistent period even if a provider returns it.
  const series = (code: string) => toDailyMap((result.series[code] ?? []).filter(p => p.date >= POWER_CONSISTENT_FROM));
  const reference = `the ${BASELINE_LABEL}`;
  if (id === "extreme-rainfall-frequency") {
    const { observations, threshold } = extremeRainfallDays(series("PRECTOTCORR"), months);
    return { observations, method: threshold === undefined
      ? `The reference record (${reference}) was too incomplete to set a threshold, so no counts are shown.`
      : `Days per month with precipitation above ${threshold.toFixed(1)} mm/day, the 95th percentile of wet days (≥ 1 mm) at this point in ${reference} (ETCCDI R95p-style threshold). Months with data on fewer than 90% of days are left blank.` };
  }
  if (id === "hot-day-frequency") {
    return { observations: hotDays(series("T2M_MAX"), months), method: `Days per month whose 2 m maximum temperature exceeded the 90th percentile for that calendar day at this point in ${reference}, using a 5-day window centred on each day (ETCCDI TX90p-style; ETCCDI uses a 30-year base). Months with data on fewer than 90% of days are left blank.` };
  }
  const observations = droughtBlend(series("PRECTOTCORR"), series("GWETROOT"), months);
  const latest = [...observations].reverse().find(o => o.value !== null);
  return { observations, method: `Equal-weight mean of two percentiles against the same calendar month in ${reference}: 3-month precipitation total (meteorological drought, an empirical SPI-3 analogue) and monthly mean root-zone soil wetness (agricultural drought). 50 is typical; lower is drier. Provisional bands: ≤30 abnormally dry, ≤20 moderately dry, ≤10 severely dry, 0 = drier than every baseline year. With 17 reference years one year is about 6 percentile points, so U.S. Drought Monitor D3/D4 levels are not resolved.${latest ? ` Latest month ${latest.date.slice(0, 7)}: ${latest.value} (${droughtCategory(latest.value!)}; rainfall ${latest.components?.rainfall3MonthPercentile}, soil wetness ${latest.components?.rootZoneWetnessPercentile}).` : ""}` };
}

/** A request outside the period the indicator can honestly report (maps to HTTP 400). */
export class ClimatePeriodError extends Error {}
