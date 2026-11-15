import assert from "node:assert/strict";
import { test } from "vitest";
import { calculateTemperatureSignificance, seasonalSlopeConfidenceInterval } from "../src/features/environmental/analysis/significance";
import type { DataSeries } from "../src/features/environmental/types/environmental";

function series(values: number[], indicator: "temperature" | "ndvi" = "temperature"): DataSeries {
  const observations = values.map((value, index) => {
    const date = new Date(Date.UTC(2020 + Math.floor(index / 12), index % 12, 15)).toISOString().slice(0, 10);
    return { date, value, unit: indicator === "temperature" ? "°C" : "NDVI", source: "NASA" };
  });
  return { indicator, dataset: indicator === "temperature" ? "NASA POWER T2M" : "MODIS", datasetId: indicator === "temperature" ? "NASA POWER T2M" : "MODIS/061/MOD13Q1", spatialResolution: "point", temporalResolution: "monthly", observations, limitations: [], validObservationCount: observations.length, expectedObservationCount: observations.length };
}

test("returns an unavailable result for short temperature windows", () => {
  const result = calculateTemperatureSignificance(series([20, 21, 22]));
  assert.equal(result.available, false);
  assert.match(result.status, /24 monthly means/);
});

test("calculates reusable temperature significance from supplied observations", () => {
  const result = calculateTemperatureSignificance(series(Array.from({ length: 48 }, (_, index) => 20 + Math.floor(index / 12) * 0.25 + (index % 2 === 0 ? -0.3 : 0.3))));
  assert.equal(result.available, true);
  assert.equal(result.method.includes("Seasonal Mann"), true);
  assert.equal(result.senSlope !== undefined, true);
  assert.equal(result.pValue !== undefined, true);
  assert.deepEqual(result.confidenceInterval, {lower: .25, upper: .25, level: .95});
});

test("rejects duplicate dates and reports missing calendar months", () => {
  const duplicate = series(Array.from({ length: 48 }, (_, index) => 20 + index * 0.01));
  duplicate.observations[1].date = duplicate.observations[0].date;
  assert.equal(calculateTemperatureSignificance(duplicate).available, false);

  const missing = series(Array.from({ length: 48 }, (_, index) => 20 + (index % 2 === 0 ? -0.2 : 0.2)));
  missing.observations = missing.observations.filter((item) => !item.date.endsWith("-03-15"));
  const result = calculateTemperatureSignificance(missing);
  assert.equal(result.available, false);
  assert.ok(result.missingCalendarMonths.length > 0);
});

test("rejects impossible observation dates", () => {
  const invalid = series(Array.from({ length: 36 }, (_, index) => 20 + index * 0.01));
  invalid.observations[0].date = "2020-02-30";
  const result = calculateTemperatureSignificance(invalid);
  assert.equal(result.monthlyObservationCount, 0);
  assert.equal(result.available, false);
});

test("does not run the temperature method for NDVI", () => {
  const result = calculateTemperatureSignificance(series(Array.from({ length: 36 }, () => 0.4), "ndvi"));
  assert.equal(result.available, false);
  assert.match(result.status, /only for NASA POWER temperature/);
});

test("uses filtered observation counts rather than inconsistent external metadata", () => {
  const input = series(Array.from({ length: 48 }, (_, index) => 20 + Math.floor(index / 12) * 0.25 + (index % 2 === 0 ? -0.3 : 0.3)));
  input.validObservationCount = 999;
  input.observations = input.observations.slice(0, 47);
  const result = calculateTemperatureSignificance(input);
  assert.equal(result.validObservationCount, 47);
  assert.equal(result.monthlyDailyObservationCounts["2020-01"], 1);
});

test("interpolates the published one-based confidence ranks", () => {
  const interval = seasonalSlopeConfidenceInterval(Array.from({length:100}, (_, i) => i + 1), 100)!;
  assert.ok(Math.abs(interval.lower - 40.20018007729973) < 1e-10);
  assert.ok(Math.abs(interval.upper - 60.79981992270027) < 1e-10);
  assert.equal(interval.level, .95);
  assert.equal(seasonalSlopeConfidenceInterval([1], 100), undefined);
  assert.equal(seasonalSlopeConfidenceInterval([NaN], 1), undefined);
  assert.equal(seasonalSlopeConfidenceInterval([1, 2], -1), undefined);
});

test("returns zero slope and a zero interval for tied constant data", () => {
  const result = calculateTemperatureSignificance(series(Array(48).fill(20)));
  assert.equal(result.available, true);
  assert.equal(result.pValue, 1);
  assert.equal(result.senSlope, 0);
  assert.deepEqual(result.confidenceInterval, {lower: 0, upper: 0, level: .95});
});

test("bounds a negative seasonal trend in units per calendar year", () => {
  const input = series(Array.from({length:48}, (_, i) => 20 - Math.floor(i / 12) * .25 + (i % 2 ? -.3 : .3)));
  const result = calculateTemperatureSignificance(input);
  assert.equal(result.available, true);
  assert.equal(result.senSlope, -.25);
  assert.equal(result.trendDirection, "decreasing");
  assert.deepEqual(result.confidenceInterval, {lower: -.25, upper: -.25, level: .95});
});

test("does not treat isolated daily readings as complete monthly means", () => {
  const input = series(Array.from({length:48}, (_, i) => 20 + (i % 2 ? .3 : -.3)));
  input.temporalResolution = "Daily";
  const result = calculateTemperatureSignificance(input);
  assert.equal(result.available, false);
  assert.equal(result.monthlyObservationCount, 0);
  assert.equal(result.confidenceInterval, undefined);
});

test("withholds intervals when serial dependence is material", () => {
  const result = calculateTemperatureSignificance(series(Array.from({length:60}, (_, i) => i)));
  assert.equal(result.available, false);
  assert.match(result.status, /autocorrelation/);
  assert.equal(result.pValue, undefined);
  assert.equal(result.confidenceInterval, undefined);
  assert.equal(result.confidenceIntervalReason, result.status);
});

test("does not infer a trend across the known POWER change", () => {
  const input = series(Array(48).fill(20));
  input.observations.forEach((point, i) => point.date = new Date(Date.UTC(2007 + Math.floor(i / 12), i % 12, 15)).toISOString().slice(0,10));
  assert.match(calculateTemperatureSignificance(input).status, /2008 change/);
});
