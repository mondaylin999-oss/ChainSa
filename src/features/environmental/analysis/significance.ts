import type { DataSeries, Observation } from "../types/environmental";

export interface SignificanceResult {
  available: boolean; status: string; method: string;
  trendDirection: "increasing" | "decreasing" | "no clear trend" | "unavailable";
  senSlope?: number; slopeUnit?: string; pValue?: number;
  confidenceInterval?: { lower: number; upper: number; level: number };
  confidenceIntervalMethod?: string;
  confidenceIntervalReason?: string;
  validObservationCount: number; expectedObservationCount?: number;
  monthlyObservationCount: number; missingCalendarMonths: string[]; seasonalCoverageFraction: number;
  monthlyDailyObservationCounts: Record<string, number>;
  analysisPeriod?: { start: string; end: string }; seasonalHandling: string;
  autocorrelation?: number; autocorrelationHandling: string; interpretation: string;
}

export const SIGNIFICANCE_METHOD = "Seasonal Mann–Kendall with seasonal Sen’s slope (experimental)";
const MIN_YEARS = 3;
const MIN_MONTHLY_OBSERVATIONS = 24;
const MAX_ACCEPTABLE_ABS_AUTOCORRELATION = 0.1;

/** Seasonal Mann–Kendall for NASA POWER T2M. Inference is withheld when serial dependence is material. */
export function calculateTemperatureSignificance(series: DataSeries): SignificanceResult {
  const invalidDate = series.observations.find((item) => !strictDate(item.date));
  const observations = series.observations.filter((item) => Number.isFinite(item.value) && strictDate(item.date)).sort((a, b) => a.date.localeCompare(b.date));
  const base = {
    validObservationCount: observations.length,
    expectedObservationCount: series.expectedObservationCount,
    monthlyObservationCount: 0, missingCalendarMonths: [] as string[], seasonalCoverageFraction: 0, monthlyDailyObservationCounts: {},
    analysisPeriod: observations.length ? { start: observations[0].date, end: observations.at(-1)!.date } : undefined,
    seasonalHandling: "Daily months need at least 90% of calendar days. Monthly means are compared only with the same calendar month in other years.",
    autocorrelationHandling: "Conservative screen: results are withheld when absolute lag-1 correlation of monthly values exceeds 0.1. This check can also flag seasonality or trend; passing it does not prove independence. P-values and intervals assume independent observations.",
  };
  if (series.indicator !== "temperature" || !series.datasetId?.startsWith("NASA POWER")) return unavailable(base, "Statistical significance is currently implemented only for NASA POWER temperature.");
  if (invalidDate) return unavailable(base, `Invalid observation date cannot be used for inference: ${invalidDate.date}.`);
  const duplicates = new Set<string>();
  for (let i = 1; i < observations.length; i++) if (observations[i].date === observations[i - 1].date) duplicates.add(observations[i].date);
  if (duplicates.size) return unavailable(base, `Duplicate observation dates cannot be used for inference: ${[...duplicates].join(", ")}.`);
  if (observations.length < 2) return unavailable(base, "At least two valid observations are required.");
  if (observations[0].date < "2009-01-01" && observations.at(-1)!.date >= "2009-01-01") return unavailable(base, "The selected period crosses the known 2008 change in NASA POWER data for Myanmar. Choose a period from 2009 onward for this calculation.");
  // A single reading must not stand in for a full daily month. Published monthly series
  // already represent a month; daily POWER series require at least 90% of calendar days.
  const daily = /daily/i.test(series.temporalResolution);
  const monthly = monthlyMeans(observations).filter(item => {
    if (!daily) return true;
    const days = new Date(Date.UTC(Number(item.date.slice(0, 4)), Number(item.date.slice(5, 7)), 0)).getUTCDate();
    return observations.filter(o => o.date.slice(0, 7) === item.date.slice(0, 7)).length >= Math.ceil(days * .9);
  });
  const monthlyDailyObservationCounts = observations.reduce<Record<string, number>>((counts, item) => { const key = item.date.slice(0, 7); counts[key] = (counts[key] ?? 0) + 1; return counts; }, {});
  const expectedMonths = calendarMonths(series.requestedStartDate && strictDate(series.requestedStartDate) ? series.requestedStartDate : observations[0].date, series.requestedEndDate && strictDate(series.requestedEndDate) ? series.requestedEndDate : observations.at(-1)!.date);
  const observedKeys = new Set(monthly.map((item) => item.date.slice(0, 7)));
  const missing = expectedMonths.filter((key) => !observedKeys.has(key));
  const prepared = { ...base, monthlyObservationCount: monthly.length, monthlyDailyObservationCounts, missingCalendarMonths: missing, seasonalCoverageFraction: expectedMonths.length ? observedKeys.size / expectedMonths.length : 0 };
  if (yearsBetween(observations[0].date, observations.at(-1)!.date) < MIN_YEARS || monthly.length < MIN_MONTHLY_OBSERVATIONS) return unavailable(prepared, `At least ${MIN_YEARS} years and ${MIN_MONTHLY_OBSERVATIONS} monthly means are required for seasonal inference.`);
  const byMonth = new Map<number, Observation[]>();
  for (const item of monthly) { const month = Number(item.date.slice(5, 7)); const group = byMonth.get(month) ?? []; group.push(item); byMonth.set(month, group); }
  const usableMonths = [...byMonth.entries()].filter(([, values]) => values.length >= 2);
  if (usableMonths.length < 10 || prepared.seasonalCoverageFraction < 0.8) return unavailable(prepared, "At least ten calendar months and 80% of the expected monthly calendar must have usable observations.");
  const autocorrelation = lagOneAutocorrelation(monthly.map((item) => item.value));
  const withAuto = { ...prepared, autocorrelation };
  if (Math.abs(autocorrelation) > MAX_ACCEPTABLE_ABS_AUTOCORRELATION) return unavailable(withAuto, "Inferential results are unavailable because material serial autocorrelation was detected; a validated dependence-aware method is required.");
  const seasonal = seasonalMannKendall(usableMonths);
  const z = seasonal.s === 0 ? 0 : (seasonal.s > 0 ? seasonal.s - 1 : seasonal.s + 1) / Math.sqrt(seasonal.variance);
  const pValue = seasonal.s === 0 ? 1 : Math.min(1, 2 * (1 - normalCdf(Math.abs(z))));
  const slopes = seasonalSlopes(usableMonths);
  const senSlope = median(slopes);
  const confidenceInterval = seasonalSlopeConfidenceInterval(slopes, seasonal.variance);
  const significant = pValue < 0.05;
  const trendDirection = significant ? (senSlope > 0 ? "increasing" : senSlope < 0 ? "decreasing" : "no clear trend") : "no clear trend";
  return { ...withAuto, available: true, status: "Experimental significance estimate", method: "Seasonal Mann–Kendall with seasonal tie correction and seasonal Sen's slope; inference limited to low-autocorrelation series.", trendDirection, senSlope, slopeUnit: `${observations[0].unit}/year`, pValue, confidenceInterval,
    confidenceIntervalMethod: "Approximate 95% Gilbert rank interval for seasonal Sen's slope; assumes independent observations after the screening checks.",
    confidenceIntervalReason: confidenceInterval ? undefined : "There are too few pairwise slopes to bound the requested interval.",
    interpretation: significant ? `The seasonal test indicates a ${trendDirection} monotonic pattern at the 0.05 threshold; this describes the observed series and does not establish causation.` : "The available observations do not provide evidence of a statistically significant seasonal monotonic trend at the 0.05 threshold." };
}

/** Gilbert (1987), pp. 225–228; also documented by PNNL VSP and EnvStats.
 * https://vsp.pnnl.gov/help/vsample/Seasonal_Kendall_Estimate_of_Slope.htm
 * https://search.r-project.org/CRAN/refmans/EnvStats/html/kendallSeasonalTrendTest.html
 * M1=(N-C)/2 and M2=(N+C)/2 are one-based ranks; interpolate at M1 and M2+1.
 * The supplied slopes must be the sorted within-season pairwise slopes, not
 * a percentile interval made from independent observations or bootstrap samples.
 */
export function seasonalSlopeConfidenceInterval(slopes: number[], variance: number): SignificanceResult["confidenceInterval"] {
  if (!slopes.length || slopes.some(value => !Number.isFinite(value)) || !Number.isFinite(variance) || variance < 0) return undefined;
  const c = 1.959963984540054 * Math.sqrt(variance);
  const lowerRank = (slopes.length - c) / 2;
  const upperRank = (slopes.length + c) / 2 + 1;
  if (lowerRank < 1 || upperRank > slopes.length) return undefined;
  const atRank = (rank: number) => {
    const index = rank - 1;
    const lo = Math.floor(index), hi = Math.ceil(index);
    return slopes[lo] + (slopes[hi] - slopes[lo]) * (index - lo);
  };
  return { lower: atRank(lowerRank), upper: atRank(upperRank), level: .95 };
}

function unavailable(base: Omit<SignificanceResult, "available" | "status" | "method" | "trendDirection" | "interpretation" | "confidenceInterval" | "pValue" | "senSlope" | "slopeUnit">, status: string): SignificanceResult { return { ...base, available: false, status, method: SIGNIFICANCE_METHOD, trendDirection: "unavailable", interpretation: status, confidenceIntervalReason: status, confidenceInterval: undefined, pValue: undefined, senSlope: undefined, slopeUnit: undefined }; }
function monthlyMeans(observations: Observation[]): Observation[] { const groups = new Map<string, Observation[]>(); for (const observation of observations) { const key = observation.date.slice(0, 7); const group = groups.get(key) ?? []; group.push(observation); groups.set(key, group); } return [...groups.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([key, items]) => ({ ...items[0], date: `${key}-15`, value: items.reduce((sum, item) => sum + item.value, 0) / items.length })); }
function seasonalMannKendall(groups: [number, Observation[]][]): { s: number; variance: number } { let s = 0; let variance = 0; for (const [, points] of groups) { for (let i = 0; i < points.length; i++) for (let j = i + 1; j < points.length; j++) s += Math.sign(points[j].value - points[i].value); const counts = new Map<number, number>(); for (const point of points) counts.set(point.value, (counts.get(point.value) ?? 0) + 1); const ties = [...counts.values()].reduce((sum, count) => sum + count * (count - 1) * (2 * count + 5), 0); const n = points.length; variance += (n * (n - 1) * (2 * n + 5) - ties) / 18; } return { s, variance: Math.max(1e-12, variance) }; }
function seasonalSlopes(groups: [number, Observation[]][]): number[] { const slopes: number[] = []; for (const [, points] of groups) for (let i = 0; i < points.length; i++) for (let j = i + 1; j < points.length; j++) { const years = Number(points[j].date.slice(0, 4)) - Number(points[i].date.slice(0, 4)); if (years > 0) slopes.push((points[j].value - points[i].value) / years); } return slopes.sort((a, b) => a - b); }
function calendarMonths(start: string, end: string): string[] { const result: string[] = []; const date = new Date(`${start.slice(0, 7)}-01T00:00:00Z`); const last = end.slice(0, 7); while (date.toISOString().slice(0, 7) <= last) { result.push(date.toISOString().slice(0, 7)); date.setUTCMonth(date.getUTCMonth() + 1); } return result; }
function lagOneAutocorrelation(values: number[]): number { const mean = values.reduce((sum, value) => sum + value, 0) / values.length; const denominator = values.reduce((sum, value) => sum + (value - mean) ** 2, 0); return denominator === 0 ? 0 : values.slice(1).reduce((sum, value, index) => sum + (value - mean) * (values[index] - mean), 0) / denominator; }
function median(values: number[]): number { const index = (values.length - 1) / 2; return values[Math.floor(index)] + (values[Math.ceil(index)] - values[Math.floor(index)]) * (index % 1); }
function yearsBetween(start: string, end: string): number { return (Date.parse(end) - Date.parse(start)) / (365.2425 * 86400000); }
function strictDate(value: string): boolean { if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false; const date = new Date(`${value}T00:00:00Z`); return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value; }
function normalCdf(value: number): number { return 0.5 * (1 + erf(value / Math.sqrt(2))); }
function erf(value: number): number { const sign = value < 0 ? -1 : 1; const x = Math.abs(value); const t = 1 / (1 + 0.3275911 * x); return sign * (1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x)); }
