import assert from "node:assert/strict";
import { test } from "vitest";
import { buildDataTrendInsight } from "../src/features/environmental/analysis/dataTrendInsight.js";
import { analyzeSeries } from "../src/features/environmental/analysis/explainChanges.js";
import type { DataSeries } from "../src/features/environmental/types/environmental.js";

const series: DataSeries = {
  indicator: "ndvi", dataset: "NASA MODIS Terra Vegetation Indices MOD13Q1 Version 6.1", datasetId: "MODIS/061/MOD13Q1", satellite: "Terra", instrument: "MODIS", spatialResolution: "250 m", temporalResolution: "16-day composite", observations: [
    { date: "2020-01-01", value: 0.4, unit: "NDVI", source: "NASA", quality: "good" },
    { date: "2021-01-01", value: 0.5, unit: "NDVI", source: "NASA", quality: "good" },
  ], limitations: ["NDVI measures vegetation greenness, not tree count."], qaPolicy: "SummaryQA policy", spatialSelection: "polygon-mean", validObservationCount: 2, rejectedObservationCount: 1, actualStartDate: "2020-01-01", actualEndDate: "2021-01-01",
};

test("preserves dataset-specific explanations for categories beyond the ZIP's indicators", () => {
  const custom: DataSeries = { ...series, indicator: "environmental", measurement: { name: "Nighttime radiance", code: "nighttime-lights", what: "Monthly satellite light observations", unit: "radiance", meaning: "Observed brightness", caution: "Not electricity consumption" } };
  const model = buildDataTrendInsight(custom, analyzeSeries(custom));
  assert.equal(model.measurement.name, "Nighttime radiance");
  assert.equal(model.measurement.caution, "Not electricity consumption");
});

test("builds descriptive trend and source metadata without significance claims", () => {
  const model = buildDataTrendInsight(series, analyzeSeries(series));
  assert.equal(model.trend.direction, "Increasing descriptive pattern");
  assert.match(model.trend.rate, /NDVI\/year/);
  assert.match(model.significance.status, /only for NASA POWER temperature/);
  assert.equal(model.significance.method, model.significance.result.method);
  assert.equal(model.sources.find((item) => item.label === "Dataset ID")?.value, "MODIS/061/MOD13Q1");
  assert.equal(model.sources.find((item) => item.label === "Valid / rejected")?.value, "2 / 1");
  assert.match(model.keyStatistics.find((item) => item.label === "Variability (SD)")?.value ?? "", /0\.0707/);
  assert.match(model.measurement.name, /Normalized Difference Vegetation Index/);
  assert.match(model.measurement.caution, /16-day/);
  assert.match(model.geography.find((item) => item.label === "Spatial basis")?.explanation ?? "", /polygon/);
  assert.equal(model.quality.find((item) => item.label === "Coverage")?.value, "Not available");
  assert.equal(model.evidence.length, 3);
  assert.match(model.trend.explanation, /elapsed calendar time/);
});

test("handles empty data and missing metadata", () => {
  const empty: DataSeries = { indicator: "ndvi", dataset: "demo", spatialResolution: "unknown", temporalResolution: "unknown", observations: [], limitations: [] };
  const model = buildDataTrendInsight(empty, analyzeSeries(empty));
  assert.equal(model.trend.direction, "Insufficient data");
  assert.equal(model.trend.rate, "Not available");
  assert.equal(model.sources.find((item) => item.label === "Dataset ID")?.value, "Not available");
  assert.equal(model.sources.find((item) => item.label === "Provider")?.value, "Not available");
  assert.match(model.overviewSummary, /No valid observations/);
  assert.match(model.geography.find((item) => item.label === "Geometry")?.explanation ?? "", /geometry/);
  assert.equal(model.variabilityComparison.available, false);
});

test("uses the actual provider for NASA POWER temperature", () => {
  const temperature: DataSeries = {
    indicator: "temperature", dataset: "NASA POWER T2M", datasetId: "NASA POWER T2M",
    provider: "NASA Langley Research Center POWER", spatialResolution: "representative point", temporalResolution: "daily",
    observations: [{ date: "2024-01-01", value: 25, unit: "Â°C", source: "NASA POWER T2M" }], limitations: [],
  };
  const model = buildDataTrendInsight(temperature, analyzeSeries(temperature));
  assert.equal(model.sources.find((item) => item.label === "Provider")?.value, "NASA Langley Research Center POWER");
  assert.match(model.measurement.meaning, /warmer/);
});

test("reports an explicitly dated descriptive variability comparison", () => {
  const temperature: DataSeries = {
    indicator: "temperature", dataset: "NASA POWER T2M", datasetId: "NASA POWER T2M", provider: "NASA Langley Research Center POWER",
    spatialResolution: "representative point", temporalResolution: "daily", observations: [
      { date: "2024-01-01", value: 20, unit: "Â°C", source: "NASA POWER" },
      { date: "2024-01-02", value: 22, unit: "Â°C", source: "NASA POWER" },
      { date: "2024-01-03", value: 30, unit: "Â°C", source: "NASA POWER" },
      { date: "2024-01-04", value: 34, unit: "Â°C", source: "NASA POWER" },
    ], limitations: [],
  };
  const model = buildDataTrendInsight(temperature, analyzeSeries(temperature));
  assert.equal(model.variabilityComparison.available, true);
  assert.match(model.variabilityComparison.explanation, /2024-01-01 to 2024-01-02/);
  assert.match(model.variabilityComparison.explanation, /not a significance test/);
});

test("explains externally supplied precipitation without claiming a retrieval client", () => {
  const precipitation: DataSeries = {
    indicator: "precipitation", dataset: "External precipitation series", spatialResolution: "grid estimate", temporalResolution: "daily",
    observations: [{ date: "2024-01-01", value: 4, unit: "mm/day", source: "external NASA dataset" }], limitations: [],
  };
  const model = buildDataTrendInsight(precipitation, analyzeSeries(precipitation));
  assert.match(model.measurement.meaning, /daily value/);
  assert.match(model.measurement.caution, /no precipitation retrieval client/);
  assert.equal(model.geography.find((item) => item.label === "Geometry")?.value, "Not available");
});
