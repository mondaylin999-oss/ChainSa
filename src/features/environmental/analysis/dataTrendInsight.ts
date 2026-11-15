import type { DataSeries } from "../types/environmental";
import type { AnalysisResult } from "./explainChanges";
import type { SignificanceResult } from "./significance";
import { calculateTemperatureSignificance } from "./significance";
import { summarizeTemporalData, type TemporalSummaryResult } from "./temporalSummaries";

export interface DataTrendInsightModel {
  overview: { location: string; coordinates: string; requestedPeriod: string; actualPeriod: string; selection: string };
  overviewSummary: string;
  measurement: { name: string; code: string; what: string; unit: string; meaning: string; caution: string };
  keyStatistics: Array<{ label: string; value: string }>;
  trend: { direction: string; rate: string; period: string; validObservations: string; explanation: string };
  evidence: Array<{ conclusion: string; observations: string; period: string; method: string; limitation: string }>;
  variabilityComparison: { available: boolean; label: string; value: string; explanation: string };
  temporal: TemporalSummaryResult;
  quality: Array<{ label: string; value: string; explanation: string }>;
  geography: Array<{ label: string; value: string; explanation: string }>;
  significance: { method: string; status: string; coverage: string; result: SignificanceResult };
  sources: Array<{ label: string; value: string }>;
  limitations: string[];
}

export function buildDataTrendInsight(series: DataSeries, analysis: AnalysisResult, context: { locationName?: string; latitude?: number; longitude?: number } = {}): DataTrendInsightModel {
  const stats = analysis.statistics;
  const firstDate = stats.first?.date ?? series.actualStartDate ?? series.requestedStartDate ?? "not available";
  const lastDate = stats.last?.date ?? series.actualEndDate ?? series.requestedEndDate ?? "not available";
  const rate = stats.trendSlopePerYear;
  const direction = stats.trend === "increasing" ? "Increasing descriptive pattern" : stats.trend === "decreasing" ? "Decreasing descriptive pattern" : stats.trend === "insufficient-data" ? "Insufficient data" : "No clear descriptive direction";
  const valid = stats.observationCount;
  const rejected = series.rejectedObservationCount ?? series.missingObservationCount;
  const significance = calculateTemperatureSignificance(series);
  const coverage = Number.isFinite(series.coverageFraction) && series.coverageFraction! >= 0 && series.coverageFraction! <= 1
    ? `${(series.coverageFraction! * 100).toFixed(1)}% valid coverage; ${valid} valid observations`
    : valid + (rejected ?? 0) > 0 ? `${valid} valid of ${valid + (rejected ?? 0)} returned observations` : `${valid} valid observations; coverage unavailable`;
  const temporal = summarizeTemporalData(series);
  const mean = !temporal.unitWarning && Number.isFinite(stats.mean) ? stats.mean : undefined;
  const safeMinimum = !temporal.unitWarning && stats.minimum && Number.isFinite(stats.minimum.value) ? stats.minimum : undefined;
  const safeMaximum = !temporal.unitWarning && stats.maximum && Number.isFinite(stats.maximum.value) ? stats.maximum : undefined;
  const safeSd = !temporal.unitWarning && Number.isFinite(stats.standardDeviation) ? stats.standardDeviation : undefined;
  const unit = series.observations[0]?.unit ?? "unit unavailable";
  const absolute = stats.absoluteChange === undefined ? "Not available" : `${stats.absoluteChange.toFixed(4)} ${unit}`;
  const percentage = stats.percentageChange === undefined ? "Not available" : `${stats.percentageChange.toFixed(2)}%`;
  const requested = series.requestedStartDate && series.requestedEndDate ? `${series.requestedStartDate} to ${series.requestedEndDate}` : "not available";
  const measurement = measurementFor(series);
  const expected = series.expectedObservationCount;
  const coverageValue = Number.isFinite(series.coverageFraction) && series.coverageFraction! >= 0 && series.coverageFraction! <= 1 ? `${(series.coverageFraction! * 100).toFixed(1)}%` : "Not available";
  const selection = series.spatialSelection ?? "Not available";
  const validObservations = series.observations.filter((item) => Number.isFinite(item.value)).sort((a, b) => a.date.localeCompare(b.date));
  const variabilityComparison = compareVariability(validObservations, unit);
  const evidence = buildEvidence(series, stats, valid, firstDate, lastDate, unit, rejected);
  return {
    overview: {
      location: context.locationName ?? "Selected location",
      coordinates: context.latitude !== undefined && context.longitude !== undefined ? `${context.latitude.toFixed(4)}, ${context.longitude.toFixed(4)}` : "Provided by host website",
      requestedPeriod: `${series.requestedStartDate ?? "not available"} to ${series.requestedEndDate ?? "not available"}`,
      actualPeriod: `${firstDate} to ${lastDate}`,
      selection: series.spatialSelection ?? "Not available",
    },
    overviewSummary: stats.first && stats.last
      ? `${series.dataset} recorded ${valid} valid ${unit} observation${valid === 1 ? "" : "s"}. Values changed by ${absolute} (${percentage}) from ${stats.first.date} to ${stats.last.date}; this is a descriptive summary, not proof of causation or statistical significance.`
      : "No valid observations are available, so no environmental change can be described for this period.",
    measurement,
    keyStatistics: [
      { label: "Mean value", value: mean === undefined ? "Not available" : `${mean.toFixed(4)} ${unit}` },
      { label: "Variability (SD)", value: safeSd === undefined ? "Not available" : `${safeSd.toFixed(4)} ${unit}` },
      { label: "Minimum", value: safeMinimum ? `${safeMinimum.value.toFixed(4)} · ${safeMinimum.date}` : "Not available" },
      { label: "Maximum", value: safeMaximum ? `${safeMaximum.value.toFixed(4)} · ${safeMaximum.date}` : "Not available" },
      { label: "Absolute change", value: absolute },
      { label: "Percentage change", value: percentage },
      { label: "Valid observations", value: String(valid) },
      { label: "Rejected / missing", value: String(rejected ?? "Not available") },
    ],
    trend: {
      direction,
      rate: rate === undefined ? "Not available" : `${rate.toFixed(4)} ${series.observations[0]?.unit ?? "units"}/year (time-based fit; descriptive only)`,
      period: `${firstDate} to ${lastDate}`,
      validObservations: String(valid),
      explanation: rate !== undefined ? "Direction and rate use a least-squares line fitted to all valid observations against elapsed calendar time. No clear change means the fitted change across the period is at most 1% of the observed range, allowing for numerical rounding. First-to-last change is reported separately. This is descriptive only, not a significance test, seasonal adjustment, forecast, or proof of causation." : "There are not enough valid observations to describe a change.",
    },
    evidence,
    variabilityComparison,
    temporal,
    quality: [
      { label: "Valid observations", value: String(valid), explanation: "Finite observations actually used in the descriptive calculations." },
      { label: "Expected observations", value: expected === undefined ? "Not available" : String(expected), explanation: "Only shown when the data source supplies a trustworthy expected count." },
      { label: "Rejected / missing", value: rejected === undefined ? "Not available" : String(rejected), explanation: "Values excluded or missing according to the supplied metadata; missing values are never treated as zero." },
      { label: "Coverage", value: coverageValue, explanation: "Valid coverage is shown only when the source provides a valid coverage fraction; MODIS composite coverage is not treated as daily coverage." },
      { label: "Temporal resolution", value: series.temporalResolution || "Not available", explanation: "The observation cadence or composite period reported by the dataset." },
      { label: "Quality filtering", value: series.qaPolicy ?? "Not available", explanation: "Dataset-specific quality rules, when supplied." },
    ],
    geography: [
      { label: "Spatial basis", value: selection, explanation: selection === "representative-point" ? "A single representative coordinate or grid cell is used; this is not a township-wide average." : selection === "polygon-mean" ? "Valid pixels inside the supplied polygon were aggregated; local variation can still be hidden by the mean." : "The spatial method was not supplied, so geographic coverage cannot be inferred." },
      { label: "Coordinates", value: context.latitude !== undefined && context.longitude !== undefined ? `${context.latitude.toFixed(4)}, ${context.longitude.toFixed(4)}` : "Provided by host website", explanation: "Coordinates identify the selected point only; boundaries must come from explicit GeoJSON geometry." },
      { label: "Spatial resolution", value: series.spatialResolution || "Not available", explanation: "The dataset grid or pixel resolution, not a guarantee of administrative-area coverage." },
      { label: "Geometry", value: series.spatialSelection === "polygon-mean" ? "Polygon supplied" : "Not available", explanation: series.spatialSelection === "polygon-mean" ? "Area processing used the supplied polygon." : "Without geometry, township-wide satellite aggregation cannot be performed." },
    ],
    significance: {
      method: significance.method,
      status: significance.status,
      coverage,
      result: significance,
    },
    sources: [
      { label: "Dataset", value: series.dataset },
      { label: "Dataset ID", value: series.datasetId ?? "Not available" },
      { label: "Provider", value: providerLabel(series) },
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

function buildEvidence(series: DataSeries, stats: AnalysisResult["statistics"], valid: number, firstDate: string, lastDate: string, unit: string, rejected?: number) {
  const quality = rejected === undefined ? "Rejected/missing count unavailable." : `${rejected} rejected or missing observation${rejected === 1 ? "" : "s"}.`;
  return [
    { conclusion: "Observed level and variability", observations: `${valid} valid observation${valid === 1 ? "" : "s"}`, period: `${firstDate} to ${lastDate}`, method: `Mean and sample standard deviation in ${unit}`, limitation: quality },
    { conclusion: "Observed change", observations: `${stats.first && stats.last ? 2 : 0} endpoint observations from the valid series`, period: `${firstDate} to ${lastDate}`, method: "Last valid value minus first valid value; percentage uses the absolute first value when nonzero", limitation: "Endpoint change can miss fluctuations between the endpoints and is descriptive only." },
    { conclusion: "Directional pattern", observations: `${valid} valid observation${valid === 1 ? "" : "s"}`, period: `${firstDate} to ${lastDate}`, method: "Least-squares fit against elapsed calendar time; direction and annual rate use the same fitted line", limitation: "No causal or statistical-significance claim is made." },
  ];
}

function compareVariability(observations: DataSeries["observations"], unit: string): DataTrendInsightModel["variabilityComparison"] {
  if (observations.length < 4) return { available: false, label: "Early versus late variability", value: "Not available", explanation: "At least four valid observations are required to form two comparable descriptive periods." };
  const midpoint = (Date.parse(observations[0].date) + Date.parse(observations.at(-1)!.date)) / 2;
  const early = observations.filter((item) => Date.parse(item.date) <= midpoint);
  const late = observations.filter((item) => Date.parse(item.date) > midpoint);
  if (early.length < 2 || late.length < 2) return { available: false, label: "Early versus late variability", value: "Not available", explanation: "Both periods need at least two valid observations." };
  const earlySd = sampleStandardDeviation(early.map((item) => item.value));
  const lateSd = sampleStandardDeviation(late.map((item) => item.value));
  return { available: true, label: "Early versus late variability", value: `${earlySd.toFixed(4)} → ${lateSd.toFixed(4)} ${unit}`, explanation: `Descriptive sample standard deviation comparison: early period ${early[0].date} to ${early.at(-1)!.date} (${early.length} observations) versus late period ${late[0].date} to ${late.at(-1)!.date} (${late.length} observations). It is not a significance test.` };
}

function sampleStandardDeviation(values: number[]) {
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  return Math.sqrt(values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / (values.length - 1));
}

function measurementFor(series: DataSeries): DataTrendInsightModel["measurement"] {
  if (series.measurement) return series.measurement;
  if (series.indicator === "environmental") return { name: series.dataset, code: series.datasetId ?? "Not available", what: "Observations from the selected dataset.", unit: series.observations[0]?.unit ?? "Not available", meaning: "Interpret values using this dataset's units, source, and quality rules.", caution: series.limitations.join(" ") };
  if (series.indicator === "temperature") return { name: "Near-surface air temperature", code: series.datasetId ?? "NASA POWER T2M", what: "The dataset's temperature estimate for the selected point or grid cell.", unit: series.observations[0]?.unit ?? "°C", meaning: "Higher values mean warmer air; the mean, minimum, and maximum summarize the supplied observations.", caution: "NASA POWER T2M is model/reanalysis-derived and is not a direct local thermometer or satellite surface-temperature measurement." };
  if (series.indicator === "ndvi") return { name: "Normalized Difference Vegetation Index", code: series.datasetId ?? "MODIS/061/MOD13Q1", what: "A satellite-derived index related to vegetation greenness.", unit: series.observations[0]?.unit ?? "NDVI", meaning: "Values are approximately -1 to +1; higher positive values generally indicate greener vegetation, subject to land cover and atmospheric conditions.", caution: "NDVI is not a tree count or confirmed deforestation measurement. MODIS observations are approximately 16-day composites and depend on pixel QA filtering." };
  return { name: "Precipitation", code: series.datasetId ?? "Not available", what: "Precipitation observations supplied by the host data source.", unit: series.observations[0]?.unit ?? "Not available", meaning: "A daily value such as mm/day is different from a total accumulated over the selected period.", caution: "This independent module has no precipitation retrieval client; display only externally supplied, clearly identified observations." };
}

function providerLabel(series: DataSeries): string {
  if (series.provider) return series.provider;
  if (series.datasetId?.startsWith("MODIS/")) return "NASA LP DAAC / USGS EROS via Google Earth Engine";
  if (series.datasetId?.startsWith("NASA POWER")) return "NASA Langley Research Center POWER";
  return "Not available";
}
