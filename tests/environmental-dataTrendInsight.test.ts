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

test("builds descriptive trend and source metadata without significance claims", () => {
  const model = buildDataTrendInsight(series, analyzeSeries(series));
  assert.equal(model.trend.direction, "Increasing descriptive pattern");
  assert.match(model.trend.rate, /NDVI\/year/);
  assert.equal(model.significance.status, "Statistical significance analysis is not yet available.");
  assert.equal(model.sources.find((item) => item.label === "Dataset ID")?.value, "MODIS/061/MOD13Q1");
  assert.equal(model.sources.find((item) => item.label === "Valid / rejected")?.value, "2 / 1");
  assert.match(model.keyStatistics.find((item) => item.label === "Variability (SD)")?.value ?? "", /0\.0707/);
});

test("handles empty data and missing metadata", () => {
  const empty: DataSeries = { indicator: "ndvi", dataset: "demo", spatialResolution: "unknown", temporalResolution: "unknown", observations: [], limitations: [] };
  const model = buildDataTrendInsight(empty, analyzeSeries(empty));
  assert.equal(model.trend.direction, "Insufficient data");
  assert.equal(model.trend.rate, "Not available");
  assert.equal(model.sources.find((item) => item.label === "Dataset ID")?.value, "Not available");
});
