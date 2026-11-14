import type { DataSeries } from "../types/environmental";
import type { AnalysisResult } from "./explainChanges";

export interface DataTrendInsightModel {
  overview: { location: string; coordinates: string; requestedPeriod: string; actualPeriod: string; selection: string };
  keyStatistics: Array<{ label: string; value: string }>;
  trend: { direction: string; rate: string; period: string; validObservations: string; explanation: string };
  significance: { method: string; status: string; coverage: string };
  sources: Array<{ label: string; value: string }>;
  limitations: string[];
}

export function buildDataTrendInsight(series: DataSeries, analysis: AnalysisResult, context: { locationName?: string; latitude?: number; longitude?: number } = {}): DataTrendInsightModel {
  const stats = analysis.statistics;
  const firstDate = stats.first?.date ?? series.actualStartDate ?? series.requestedStartDate ?? "not available";
  const lastDate = stats.last?.date ?? series.actualEndDate ?? series.requestedEndDate ?? "not available";
  const rate = stats.first && stats.last ? endpointRatePerYear(stats.first.date, stats.last.date, stats.absoluteChange ?? 0) : undefined;
  const direction = stats.trend === "increasing" ? "Increasing descriptive pattern" : stats.trend === "decreasing" ? "Decreasing descriptive pattern" : stats.trend === "insufficient-data" ? "Insufficient data" : "No clear descriptive direction";
  const valid = series.validObservationCount ?? stats.observationCount;
  const rejected = series.rejectedObservationCount ?? series.missingObservationCount;
  const coverage = valid + (rejected ?? 0) > 0 ? `${valid} valid of ${valid + (rejected ?? 0)} returned observations` : `${valid} valid observations`;
  const mean = series.observations.length > 0 ? series.observations.reduce((sum, item) => sum + item.value, 0) / series.observations.length : undefined;
  return {
    overview: {
      location: context.locationName ?? "Selected location",
      coordinates: context.latitude !== undefined && context.longitude !== undefined ? `${context.latitude.toFixed(4)}, ${context.longitude.toFixed(4)}` : "Provided by host website",
      requestedPeriod: `${series.requestedStartDate ?? "not available"} to ${series.requestedEndDate ?? "not available"}`,
      actualPeriod: `${firstDate} to ${lastDate}`,
      selection: series.spatialSelection ?? "Not available",
    },
    keyStatistics: [
      { label: "Mean value", value: mean === undefined ? "Not available" : `${mean.toFixed(4)} ${series.observations[0]?.unit ?? ""}`.trim() },
      { label: "Variability (SD)", value: stats.standardDeviation === undefined ? "Not available" : `${stats.standardDeviation.toFixed(4)} ${series.observations[0]?.unit ?? ""}`.trim() },
      { label: "Minimum", value: stats.minimum ? `${stats.minimum.value.toFixed(4)} · ${stats.minimum.date}` : "Not available" },
      { label: "Maximum", value: stats.maximum ? `${stats.maximum.value.toFixed(4)} · ${stats.maximum.date}` : "Not available" },
      { label: "Valid observations", value: String(valid) },
      { label: "Rejected / missing", value: String(rejected ?? "Not available") },
    ],
    trend: {
      direction,
      rate: rate === undefined ? "Not available" : `${rate.toFixed(4)} ${series.observations[0]?.unit ?? "units"}/year (endpoint rate; descriptive only)`,
      period: `${firstDate} to ${lastDate}`,
      validObservations: String(valid),
      explanation: stats.first && stats.last ? "This describes the change between the first and last valid observations. It is not a statistically significant trend test and does not establish causation." : "There are not enough valid observations to describe a change.",
    },
    significance: {
      method: "Not implemented",
      status: "Statistical significance analysis is not yet available.",
      coverage,
    },
    sources: [
      { label: "Dataset", value: series.dataset },
      { label: "Dataset ID", value: series.datasetId ?? "Not available" },
      { label: "Provider", value: series.provider ?? (series.datasetId === "NASA_POWER" ? "NASA POWER" : "NASA LP DAAC / USGS EROS") },
      { label: "Satellite / instrument", value: [series.satellite, series.instrument].filter(Boolean).join(" / ") || "Not available" },
      { label: "Spatial resolution", value: series.spatialResolution },
      { label: "Temporal frequency", value: series.temporalResolution },
      { label: "Actual observations", value: `${firstDate} to ${lastDate}` },
      { label: "QA policy", value: series.qaPolicy ?? "Not available" },
      { label: "Spatial selection", value: series.spatialSelection ?? "Not available" },
      { label: "Valid / rejected", value: `${valid} / ${rejected ?? "not available"}` },
    ],
    limitations: series.limitations,
  };
}

function endpointRatePerYear(firstDate: string, lastDate: string, absoluteChange: number): number | undefined {
  const elapsedYears = (Date.parse(lastDate) - Date.parse(firstDate)) / (365.2425 * 24 * 60 * 60 * 1000);
  return elapsedYears > 0 ? absoluteChange / elapsedYears : undefined;
}
