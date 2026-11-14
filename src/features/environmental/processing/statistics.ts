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
  trendSlopePerObservation?: number;
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
  const tolerance = Math.max(0.000001, (maximum.value - minimum.value) * 0.01);

  return {
    observationCount: observations.length,
    first,
    last,
    absoluteChange,
    percentageChange,
    minimum,
    maximum,
    trend: Math.abs(slope) <= tolerance ? "stable" : slope > 0 ? "increasing" : "decreasing",
    coverage: 1,
    mean,
    standardDeviation,
    trendSlopePerObservation: slope,
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
