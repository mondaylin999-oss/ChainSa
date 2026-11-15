import assert from "node:assert/strict";
import { test } from "vitest";
import { summarizeTemporalData } from "../src/features/environmental/analysis/temporalSummaries.js";
import type { DataSeries } from "../src/features/environmental/types/environmental.js";

const base = (overrides: Partial<DataSeries> = {}): DataSeries => ({ indicator: "temperature", dataset: "NASA POWER T2M", datasetId: "NASA POWER T2M", spatialResolution: "point", temporalResolution: "daily", observations: [], limitations: [], requestedStartDate: "2024-01-01", requestedEndDate: "2024-03-31", ...overrides });

test("does not turn annual land-cover observations into monthly patterns", () => {
  const result = summarizeTemporalData(base({ temporalResolution: "Annual", observations: [{ date: "2024-01-01", value: 42, unit: "%", source: "MODIS" }] }));
  assert.equal(result.cadence, "annual");
  assert.equal(result.aggregationAvailable, false);
  assert.deepEqual(result.monthly, []);
  assert.ok(result.seasonal.every(row => row.status === "insufficient"));
});

test("recognizes monthly and eight-day data without assuming daily coverage", () => {
  assert.equal(summarizeTemporalData(base({ temporalResolution: "Monthly" })).cadence, "monthly");
  assert.equal(summarizeTemporalData(base({ temporalResolution: "8-day" })).cadence, "composite");
  const invalid = summarizeTemporalData(base({ observations: [{ date: "2024-13-01", value: 1, unit: "K", source: "NASA" }] }));
  assert.equal(invalid.invalidDateCount, 1);
});

test("aggregates daily observations and identifies partial and missing months", () => {
  const result = summarizeTemporalData(base({ observations: [
    { date: "2024-01-01", value: 10, unit: "Â°C", source: "NASA" }, { date: "2024-01-02", value: 12, unit: "Â°C", source: "NASA" },
    { date: "2024-03-01", value: -2, unit: "Â°C", source: "NASA" },
  ] }));
  assert.equal(result.monthly[0].mean, 11);
  assert.equal(result.monthly[0].status, "partial");
  assert.equal(result.monthly[1].status, "missing");
  assert.deepEqual(result.missingMonths, ["2024-02"]);
  assert.equal(result.cadence, "daily");
});

test("uses only requested days for partial first and last months, including leap February", () => {
  const result = summarizeTemporalData(base({ requestedStartDate: "2024-02-28", requestedEndDate: "2024-03-01", observations: [
    { date: "2024-02-28", value: 1, unit: "Â°C", source: "NASA" }, { date: "2024-02-29", value: 2, unit: "Â°C", source: "NASA" }, { date: "2024-03-01", value: 3, unit: "Â°C", source: "NASA" },
  ] }));
  assert.equal(result.monthly[0].expectedObservationCount, 2);
  assert.equal(result.monthly[0].status, "complete");
  assert.equal(result.monthly[1].expectedObservationCount, 1);
  assert.equal(result.monthly[1].status, "complete");
});

test("keeps MODIS composites as composites with unknown monthly completeness", () => {
  const result = summarizeTemporalData(base({ indicator: "ndvi", datasetId: "MODIS/061/MOD13Q1", temporalResolution: "16-day composite", observations: [
    { date: "2020-01-01", value: 0.2, unit: "NDVI", source: "MODIS" }, { date: "2020-01-17", value: 0.4, unit: "NDVI", source: "MODIS" },
  ], requestedStartDate: "2020-01-01", requestedEndDate: "2020-01-31" }));
  assert.equal(result.cadence, "composite");
  assert.equal(result.monthly[0].status, "unknown-coverage");
  assert.match(result.aggregationMethod, /not time-weighted/);
});

test("excludes duplicate dates and invalid dates transparently", () => {
  const result = summarizeTemporalData(base({ observations: [
    { date: "2024-01-01", value: 1, unit: "Â°C", source: "NASA" }, { date: "2024-01-01", value: 2, unit: "Â°C", source: "NASA" }, { date: "2024-02-31", value: 4, unit: "Â°C", source: "NASA" },
  ] }));
  assert.equal(result.duplicateDateCount, 1);
  assert.equal(result.invalidDateCount, 1);
  assert.equal(result.monthly[0].validObservationCount, 0);
});

test("rejects mixed or missing units instead of combining incompatible values", () => {
  const mixed = summarizeTemporalData(base({ observations: [{ date: "2024-01-01", value: 1, unit: "Â°C", source: "NASA" }, { date: "2024-01-02", value: 2, unit: "K", source: "NASA" }] }));
  assert.equal(mixed.aggregationAvailable, false);
  assert.match(mixed.unitWarning ?? "", /Mixed units/);
  const missing = summarizeTemporalData(base({ observations: [{ date: "2024-01-01", value: 1, unit: "", source: "NASA" }] }));
  assert.equal(missing.aggregationAvailable, false);
});

test("distinguishes identical, conflicting, and invalid duplicate dates", () => {
  const result = summarizeTemporalData(base({ observations: [
    { date: "2024-01-01", value: 1, unit: "Â°C", source: "NASA" }, { date: "2024-01-01", value: 1, unit: "Â°C", source: "NASA" },
    { date: "2024-01-02", value: 2, unit: "Â°C", source: "NASA" }, { date: "2024-01-02", value: 3, unit: "Â°C", source: "NASA" },
    { date: "2024-02-31", value: 4, unit: "Â°C", source: "NASA" }, { date: "2024-02-31", value: 5, unit: "Â°C", source: "NASA" },
  ] }));
  assert.equal(result.identicalDuplicateDateCount, 1);
  assert.equal(result.conflictingDuplicateDateCount, 1);
  assert.equal(result.duplicateInvalidDateCount, 1);
});

test("provides neutral calendar-quarter summaries only with sufficient years", () => {
  const observations = ["2023-01-01", "2023-02-01", "2023-04-01", "2023-05-01", "2024-01-01", "2024-02-01", "2024-04-01", "2024-05-01"].map((date, index) => ({ date, value: index + 1, unit: "Â°C", source: "NASA" }));
  const result = summarizeTemporalData(base({ observations, requestedStartDate: "2023-01-01", requestedEndDate: "2024-12-31" }));
  assert.equal(result.seasonal.find((item) => item.season === "Q1")?.status, "supported");
  assert.equal(result.seasonal.find((item) => item.season === "Q3")?.status, "insufficient");
});
