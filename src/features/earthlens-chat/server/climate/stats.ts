import "server-only";
import { addDays } from "../nasa/power";

/**
 * Pure statistics helpers for comparing current NASA POWER values with the consistent NASA POWER record (2009–present; see nasa/power-homogeneity.ts).
 * Nothing here forecasts anything: every output describes the past.
 */

export type DailyMap = Map<string, number>; // YYYY-MM-DD -> value (missing days are absent)

export function toDailyMap(points: { date: string; value: number | null }[]): DailyMap {
  const m: DailyMap = new Map();
  for (const p of points) if (p.value !== null && Number.isFinite(p.value)) m.set(p.date, p.value);
  return m;
}

/** Same month/day in another year; 29 Feb becomes 28 Feb in non-leap years. */
export function sameDateInYear(date: string, year: number): string {
  const [, m, d] = date.split("-").map(Number);
  const leap = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
  const day = m === 2 && d === 29 && !leap ? 28 : d;
  return `${year}-${String(m).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/** Sum over [start, end]; undefined if fewer than `minCoverage` of the days have data. */
export function windowSum(map: DailyMap, start: string, end: string, minCoverage = 0.9): number | undefined {
  let sum = 0, have = 0, n = 0;
  for (let d = start; d <= end; d = addDays(d, 1)) {
    n++;
    const v = map.get(d);
    if (v !== undefined) { sum += v; have++; }
  }
  return n && have / n >= minCoverage ? sum : undefined;
}

export function windowMax(map: DailyMap, start: string, end: string): number | undefined {
  let best: number | undefined;
  for (let d = start; d <= end; d = addDays(d, 1)) {
    const v = map.get(d);
    if (v !== undefined && (best === undefined || v > best)) best = v;
  }
  return best;
}

/** Empirical percentile rank (0–100) of `value` within `sample` (mid-rank for ties). */
export function percentileRank(value: number, sample: number[]): number | undefined {
  if (!sample.length) return undefined;
  let below = 0, equal = 0;
  for (const s of sample) { if (s < value) below++; else if (s === value) equal++; }
  return ((below + 0.5 * equal) / sample.length) * 100;
}

/** Linear-interpolated quantile, q in [0, 1]. */
export function quantile(sample: number[], q: number): number | undefined {
  if (!sample.length) return undefined;
  const s = [...sample].sort((a, b) => a - b);
  const pos = (s.length - 1) * q;
  const lo = Math.floor(pos), hi = Math.ceil(pos);
  return s[lo] + (s[hi] - s[lo]) * (pos - lo);
}

/**
 * For each past year, the sum over the window of `days` ending on the same calendar date.
 * Only complete past years before `beforeDate` are used.
 */
export function historicalWindowSums(map: DailyMap, endDate: string, days: number, firstYear: number, beforeDate: string): { year: number; value: number }[] {
  const out: { year: number; value: number }[] = [];
  const endYear = Number(endDate.slice(0, 4));
  for (let y = firstYear; y <= endYear; y++) {
    const e = sameDateInYear(endDate, y);
    const s = addDays(e, -(days - 1));
    if (e >= beforeDate) continue; // only windows that are fully in the past and not the current one
    const v = windowSum(map, s, e);
    if (v !== undefined) out.push({ year: y, value: v });
  }
  return out;
}

/** Values within ±halfWidth days of the same calendar date in each past year (for daily variables). */
export function seasonalSample(map: DailyMap, date: string, halfWidth: number, firstYear: number, beforeDate: string): number[] {
  const out: number[] = [];
  const endYear = Number(date.slice(0, 4));
  for (let y = firstYear; y <= endYear; y++) {
    const c = sameDateInYear(date, y);
    for (let k = -halfWidth; k <= halfWidth; k++) {
      const d = addDays(c, k);
      if (d >= beforeDate) continue;
      const v = map.get(d);
      if (v !== undefined) out.push(v);
    }
  }
  return out;
}

/** All daily values (used for the "top 1% of days" heavy-rain threshold). */
export function allValues(map: DailyMap, beforeDate: string): number[] {
  const out: number[] = [];
  for (const [d, v] of map) if (d < beforeDate) out.push(v);
  return out;
}
