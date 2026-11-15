import type { DataSeries, Observation } from "../types/environmental";

export interface SeriesStatistics {
  observationCount: number;
  first?: Observation;
  last?: Observation;
  absoluteChange?: number;
  percentageChange?: number;
  minimum?: Observation;
  maximum?: Observation;
  trend: "increasing" | "decreasing" | "stable" | "insufficient-data";
  coverage: number;
  mean?: number;
  standardDeviation?: number;
  /** Legacy index-based slope; retained for compatibility, not used for trend presentation. */
  trendSlopePerObservation?: number;
  trendSlopePerYear?: number;
  fittedTrendStart?: number;
  fittedTrendEnd?: number;
}

export function calculateStatistics(series: DataSeries): SeriesStatistics {
  const observations = [...series.observations].sort((a, b) => a.date.localeCompare(b.date));
  if (observations.length === 0) {
    return { observationCount: 0, trend: "insufficient-data", coverage: 0 };
  }

  const first = observations[0];
  const last = observations[observations.length - 1];
  const absoluteChange = last.value - first.value;
  const percentageChange = first.value === 0 ? undefined : (absoluteChange / Math.abs(first.value)) * 100;
  const minimum = observations.reduce((a, b) => (b.value < a.value ? b : a));
  const maximum = observations.reduce((a, b) => (b.value > a.value ? b : a));
  const mean = observations.reduce((sum, item) => sum + item.value, 0) / observations.length;
  const standardDeviation = observations.length > 1
    ? Math.sqrt(observations.reduce((sum, item) => sum + (item.value - mean) ** 2, 0) / (observations.length - 1))
    : 0;

  const slope = linearSlope(observations);
  const fit = timeTrend(observations);

  return {
    observationCount: observations.length,
    first,
    last,
    absoluteChange,
    percentageChange,
    minimum,
    maximum,
    trend: !fit ? "insufficient-data" : Math.abs(fit.end - fit.start) <= fit.tolerance ? "stable" : fit.slope > 0 ? "increasing" : "decreasing",
    coverage: 1,
    mean,
    standardDeviation,
    trendSlopePerObservation: slope,
    trendSlopePerYear: fit?.slope,
    fittedTrendStart: fit?.start,
    fittedTrendEnd: fit?.end,
  };
}

function linearSlope(observations: Observation[]): number {
  if (observations.length < 2) return 0;
  const meanX = (observations.length - 1) / 2;
  const meanY = observations.reduce((sum, item) => sum + item.value, 0) / observations.length;
  const numerator = observations.reduce((sum, item, index) => sum + (index - meanX) * (item.value - meanY), 0);
  const denominator = observations.reduce((sum, _, index) => sum + (index - meanX) ** 2, 0);
  return denominator === 0 ? 0 : numerator / denominator;
}

/** Descriptive least-squares fit against actual elapsed calendar time; no significance inference. */
function timeTrend(observations: Observation[]) {
  if (observations.length < 2) return undefined;
  const dates = observations.map(o => Date.parse(o.date));
  const units = new Set(observations.map(o => o.unit?.trim()));
  if (units.size !== 1 || !observations[0].unit?.trim() || new Set(dates).size !== dates.length
    || observations.some((o,i) => !Number.isFinite(o.value) || !Number.isFinite(dates[i])
      || !/^\d{4}-\d{2}-\d{2}$/.test(o.date) || new Date(dates[i]).toISOString().slice(0,10) !== o.date)) return undefined;
  const years = dates.map(date => (date - dates[0]) / (365.2425 * 86400000));
  const meanX = years.reduce((sum,x) => sum+x,0) / years.length;
  const meanY = observations.reduce((sum,o) => sum+o.value,0) / observations.length;
  const denominator = years.reduce((sum,x) => sum+(x-meanX)**2,0);
  if (!denominator) return undefined;
  const slope = observations.reduce((sum,o,i) => sum+(years[i]-meanX)*(o.value-meanY),0) / denominator;
  const start = meanY - slope*meanX;
  const end = start+slope*years.at(-1)!;
  const values = observations.map(o=>o.value);
  const range = Math.max(...values)-Math.min(...values);
  // Compare quantities in the same unit, independent of sample count or temporal cadence.
  const tolerance = Math.max(range*.01, Number.EPSILON*32*Math.max(...values.map(Math.abs),Number.MIN_VALUE));
  return [slope,start,end,tolerance].every(Number.isFinite) ? {slope,start,end,tolerance} : undefined;
}
