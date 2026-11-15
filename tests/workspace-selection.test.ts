import { describe, expect, it } from "vitest";
import { DATASETS, TOPICS, type DatasetDefinition } from "@/features/explorer/catalog";
import type { ObservationSelection } from "@/features/explorer/client/data-service";
import { selectionError } from "@/features/explorer/workspace-selection";

import { INDICATOR_COPY, CATEGORY_COPY, indicatorName, indicatorDescription, spatialBasisName } from "@/features/explorer/workspace-copy";

const today = "2026-11-15";
const base: ObservationSelection = { topicId: "agriculture", regionId: "yangon", datasetId: "rainfall", start: "2025-01-01", end: "2025-01-03" };
const dataset = (id = "rainfall") => DATASETS.find(d => d.id === id)!;
const validate = (changes: Partial<ObservationSelection> = {}, definition: DatasetDefinition | undefined = dataset(), mode: "reference" | "township" = "reference") => selectionError({ ...base, ...changes }, definition, mode, today);
const dateAfter = (start: string, days: number) => new Date(Date.parse(start) + days * 86400000).toISOString().slice(0, 10);

describe("workspace catalog retention", () => {
  it("retains all six topic catalogs", () => {
    expect(TOPICS.map(t => t.id).sort()).toEqual(["agriculture", "disaster-intelligence", "energy", "environmental-change", "infrastructure-urban-change", "water"]);
    for (const topic of TOPICS) {
      expect(DATASETS.some(d => d.topicId === topic.id), topic.id).toBe(true);
      for (const indicator of topic.indicators) {
        expect(DATASETS.find(d => d.id === indicator.datasetId && d.topicId === topic.id), indicator.label).toBeDefined();
      }
    }
    expect(new Set(DATASETS.map(d => d.id)).size).toBe(DATASETS.length);
  });

  it("retains the complete existing 36-dataset catalog", () => {
    // Baseline inventory: current main has 36 datasets; the request referred to 38.
    // Preserve the existing inventory rather than inventing products to reach that count.
    expect(DATASETS).toHaveLength(36);
  });
});

describe("workspace selection prerequisites", () => {
  it("requires a region before a location or indicator", () => expect(validate({ regionId: "", townshipId: "" }, undefined, "township")).toMatch(/state or region/i));
  it("requires a township in township mode", () => expect(validate({}, dataset(), "township")).toMatch(/choose a township/i));
  it("accepts a chosen township and explicit reference-point mode", () => {
    expect(validate({ townshipId: "MMR013040" }, dataset(), "township")).toBe("");
    expect(validate({}, dataset(), "reference")).toBe("");
  });
  it("requires an indicator", () => expect(selectionError(base, undefined, "reference", today)).toMatch(/indicator/i));
  it("distinguishes setup requirements from temporarily unavailable indicators", () => {
    expect(validate({}, { ...dataset(), available: false, setupRequired: true })).toMatch(/setup/i);
    expect(validate({}, { ...dataset(), available: false, setupRequired: false })).toMatch(/unavailable/i);
  });
});

describe("workspace calendar validation", () => {
  it.each([
    ["", "2025-01-03", /both/i],
    ["2025-01-01", "", /both/i],
    ["2025-02-29", "2025-03-01", /real calendar/i],
    ["2024-02-30", "2024-03-01", /real calendar/i],
    ["2025-1-01", "2025-01-03", /real calendar/i],
    ["2025-01-04", "2025-01-03", /on or before/i],
    ["1980-12-31", "1981-01-01", /1981-01-01/],
    ["2026-11-15", "2026-11-16", /future/i],
  ])("rejects %s to %s", (start, end, message) => expect(validate({ start, end })).toMatch(message));
  it("accepts leap days, a single day, and today", () => {
    expect(validate({ start: "2024-02-29", end: "2024-02-29" })).toBe("");
    expect(validate({ start: today, end: today })).toBe("");
  });
  it("preserves long historical POWER queries without an arbitrary chart cap", () => expect(validate({ start: "1989-01-01", end: today })).toBe(""));
});

describe("workspace published dataset coverage", () => {
  it.each(DATASETS.filter(d => d.coverage && /^\d{4}-\d{2}-\d{2}$/.test(d.coverage.start)))("enforces $id archive start", d => {
    const start = d.coverage!.start;
    const available = { ...d, available: true };
    expect(validate({ start: dateAfter(start, -1), end: start }, available)).toContain(start);
    expect(validate({ start, end: start }, available)).toBe("");
  });
  it("enforces a fixed archive end inclusively", () => {
    const fixed = { ...dataset(), coverage: { start: "2001-01-01", end: "2021-12-31" } };
    expect(validate({ start: "2021-12-31", end: "2021-12-31" }, fixed)).toBe("");
    expect(validate({ start: "2021-12-31", end: "2022-01-01" }, fixed)).toContain("2021-12-31");
  });
  it("allows an ongoing archive beyond its last known release", () => {
    expect(validate({ start: "2025-01-01", end: "2025-01-02" }, dataset("land-cover"))).toBe("");
  });
});

describe("workspace provider range limits", () => {
  it.each([
    ["aerosol-optical-depth", "2024-03-05", 731],
    ["river-discharge", "2023-07-26", 1100],
    ["river-water-surface-elevation", "2023-07-26", 1100],
    ["river-width", "2023-07-26", 1100],
    ["river-surface-slope", "2023-07-26", 1100],
    ["reservoir-surface-area", "2023-07-26", 1100],
    ["seasonal-water-change", "2024-01-01", 366],
    ["agriculture-vegetation-index", "2024-01-01", 366],
    ["vegetation-index", "2024-01-01", 366],
  ] as const)("accepts the inclusive maximum and rejects one extra day for %s", (id, start, cap) => {
    const d = { ...dataset(id), available: true };
    expect(validate({ start, end: dateAfter(start, cap - 1) }, d)).toBe("");
    expect(validate({ start, end: dateAfter(start, cap) }, d)).not.toBe("");
  });

  it.each([
    ["2026-11-09", today],
    ["2026-11-09", "2026-11-10"],
    ["2026-11-14", "2026-11-14"],
    [today, today],
  ])("accepts FIRMS trailing-seven-day subrange %s to %s", (start, end) => expect(validate({ start, end }, dataset("fire-detections"))).toBe(""));
  it.each([
    ["2026-11-08", today],
    ["2026-11-08", "2026-11-08"],
    ["2025-01-01", "2025-01-02"],
  ])("rejects FIRMS dates outside the public seven-day feed: %s to %s", (start, end) => expect(validate({ start, end }, dataset("fire-detections"))).toMatch(/seven days/i));
});


describe("workspace bilingual coverage", () => {
  it.each(DATASETS)("provides Burmese names and explanations for $id", dataset => {
    expect(INDICATOR_COPY).toHaveProperty(dataset.id);
    expect(indicatorName(dataset.id,dataset.label,"my")).toMatch(/[\u1000-\u109f]/);
    expect(indicatorDescription(dataset.id,dataset.description,"my")).toMatch(/[\u1000-\u109f]/);
  });
  it("translates all categories without describing unknown sampling as a point", () => {
    for(const topic of TOPICS) expect(CATEGORY_COPY).toHaveProperty(topic.id);
    expect(spatialBasisName("unknown","en")).toBe("Spatial basis not supplied");
    expect(spatialBasisName("unknown","my")).toMatch(/[\u1000-\u109f]/);
  });
});
