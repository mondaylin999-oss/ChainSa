import assert from "node:assert/strict";
import { test } from "vitest";
import { calculateStatistics } from "../src/features/environmental/processing/statistics.js";

test("calculates change, extrema, and trend", () => {
  const result = calculateStatistics({
    indicator: "temperature",
    dataset: "demo",
    spatialResolution: "point",
    temporalResolution: "daily",
    limitations: [],
    observations: [
      { date: "2024-01-03", value: 12, unit: "°C", source: "demo" },
      { date: "2024-01-01", value: 10, unit: "°C", source: "demo" },
      { date: "2024-01-02", value: 11, unit: "°C", source: "demo" },
    ],
  });

  assert.equal(result.first?.value, 10);
  assert.equal(result.last?.value, 12);
  assert.equal(result.absoluteChange, 2);
  assert.equal(result.percentageChange, 20);
  assert.equal(result.minimum?.value, 10);
  assert.equal(result.maximum?.value, 12);
  assert.equal(result.trend, "increasing");
  assert.equal(result.mean, 11);
  assert.equal(result.standardDeviation, 1);
  assert.equal(result.trendSlopePerObservation, 1);
});

test("does not calculate a percentage from a zero baseline", () => {
  const result = calculateStatistics({
    indicator: "ndvi", dataset: "demo", spatialResolution: "pixel", temporalResolution: "daily", limitations: [],
    observations: [
      { date: "2024-01-01", value: 0, unit: "index", source: "demo" },
      { date: "2024-01-02", value: 1, unit: "index", source: "demo" },
    ],
  });
  assert.equal(result.percentageChange, undefined);
});
