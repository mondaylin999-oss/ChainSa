import { beforeEach, describe, expect, it } from "vitest";
import { clearNdviCacheForTests, fetchNdviSummary, parseNdviSubset, percentileRank } from "@/features/earthlens-chat/server/nasa/modis-ndvi";
import { clearPowerCacheForTests } from "@/features/earthlens-chat/server/nasa/power";
import { answerChat } from "@/features/earthlens-chat/server/handler";
import { baseConfig, mockFetch, powerFromUrl } from "./fixtures";

const BASE = "https://modis.ornl.gov/rst/api/v1";

/** ORNL-style subset response; `values` are raw NDVI integers (scale 0.0001). */
const subsetJson = (rows: { modis: string; date: string; data: number[] }[]) => ({
  band: "250m_16_days_NDVI",
  subset: rows.map((r) => ({ modis_date: r.modis, calendar_date: r.date, band: "250m_16_days_NDVI", tile: "h26v06", data: r.data })),
});

/** Mock ORNL service: latest composite 2026-10-16 (A2026289); past years 0.55–0.64. */
function ornl(opts: { failYears?: number[] } = {}) {
  return (url: string) => {
    if (url.includes("/dates?"))
      return Response.json({ dates: [{ modis_date: "A2026273", calendar_date: "2026-09-30" }, { modis_date: "A2026289", calendar_date: "2026-10-16" }] });
    const start = /startDate=(A\d{7})/.exec(url)![1];
    if (start === "A2026273")
      return Response.json(subsetJson([
        { modis: "A2026273", date: "2026-09-30", data: [6800, 6900, -3000] },
        { modis: "A2026289", date: "2026-10-16", data: [6400, 6500, 6600] },
      ]));
    const y = Number(start.slice(1, 5));
    if (opts.failYears?.includes(y)) return new Response("busy", { status: 503 });
    return Response.json(subsetJson([{ modis: start, date: `${y}-10-16`, data: [5500 + (y - 2016) * 100] }]));
  };
}

beforeEach(() => {
  clearNdviCacheForTests();
  clearPowerCacheForTests();
});

describe("MODIS NDVI parsing", () => {
  it("applies the 0.0001 scale and drops -3000 fill and out-of-range pixels", () => {
    const c = parseNdviSubset(subsetJson([{ modis: "A2026289", date: "2026-10-16", data: [6000, -3000, 7000, 20000] }]));
    expect(c[0]).toMatchObject({ date: "2026-10-16", value: 0.65, validPixels: 2, totalPixels: 4 });
  });
  it("returns null when every pixel is missing (e.g. clouds)", () => {
    expect(parseNdviSubset(subsetJson([{ modis: "A2026289", date: "2026-10-16", data: [-3000, -3000] }]))[0].value).toBeNull();
  });
  it("rejects an unexpected response", () => {
    expect(() => parseNdviSubset({ error: "too many tiles" })).toThrow(/Unexpected MODIS/);
  });
  it("percentile needs at least 5 reference years", () => {
    expect(percentileRank(0.6, [0.5, 0.55])).toBeNull();
    expect(percentileRank(0.6, [0.5, 0.55, 0.58, 0.62, 0.7])).toBe(60);
  });
});

describe("MODIS NDVI summary", () => {
  it("returns latest, previous and the same composite in past years", async () => {
    const { f } = mockFetch({ [BASE]: ornl() });
    const s = await fetchNdviSummary(21.4, 95.95, 1000, f, BASE, "wait");
    expect(s.latest).toMatchObject({ date: "2026-10-16", value: 0.65 });
    expect(s.previous?.value).toBe(0.685);
    expect(s.history.map((h) => h.year)).toEqual([2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025]);
    expect(s.historyMean).toBe(0.595);
    expect(s.percentile).toBe(100); // 0.65 is greener than every past year (0.55–0.64)
    expect(s.historyStatus).toBe("ok");
  });

  it("keeps going when some past years fail", async () => {
    const { f } = mockFetch({ [BASE]: ornl({ failYears: [2019, 2022] }) });
    const s = await fetchNdviSummary(21.4, 95.95, 1000, f, BASE, "wait");
    expect(s.history).toHaveLength(8);
    expect(s.historyStatus).toBe("ok");
  });

  it("cached-only mode does not wait for past years, then uses them once cached", async () => {
    const { f } = mockFetch({ [BASE]: ornl() });
    const first = await fetchNdviSummary(21.4, 95.95, 1000, f, BASE, "cached-only");
    expect(first.historyStatus).toBe("pending");
    expect(first.history).toHaveLength(0);
    await fetchNdviSummary(21.4, 95.95, 1000, f, BASE, "wait"); // let the background job finish
    const later = await fetchNdviSummary(21.4, 95.95, 1000, f, BASE, "cached-only");
    expect(later.historyStatus).toBe("ok");
  });
});

describe("chatbot uses MODIS NDVI", () => {
  const nasa = (url: string) => Response.json(powerFromUrl(url));

  it("adds NDVI to Current NASA Data, Historical Comparison and Data Sources for crop questions", async () => {
    const { f } = mockFetch({ "https://power.larc.nasa.gov": nasa, [BASE]: ornl() });
    await fetchNdviSummary(21.4, 95.95, 1000, f, BASE, "wait"); // warm the past-year cache
    const r = await answerChat({ message: "How are rice crops in Mandalay?" }, { config: baseConfig(), fetchImpl: f, today: "2026-11-13" });
    const row = r.dataTable!.rows.find((x) => x.param === "vegetation")!;
    expect(row.latest).toMatchObject({ value: 0.65, unit: "NDVI", when: "2026-10-16 → 2026-10-31" });
    expect(row.reference?.value).toBe(0.59); // 0.595 shown with NDVI's 2-decimal precision
    expect(row.referenceLabel).toBe("mean 2016–2025");
    expect(row.difference?.value).toBe(0.06);
    expect(row.rank).toBe(100);
    expect(r.sections.current).toContain("| Vegetation greenness (MODIS NDVI) | 0.65 NDVI (2026-10-16 → 2026-10-31) | 0.59 NDVI (mean 2016–2025) | +0.06 NDVI, rank 100 |");
    expect(r.sections.history).toContain("vegetation greenness (NDVI) is well above usual (rank 100 of 100)");
    expect(r.sections.sources).toContain("MOD13Q1");
    expect(r.sections.sources).toContain("modis.ornl.gov");
    expect(r.facts.some((x) => x.source === "nasa-modis-ndvi")).toBe(true);
  });

  it("says the past-year comparison is being prepared when it is not cached yet", async () => {
    const { f } = mockFetch({ "https://power.larc.nasa.gov": nasa, [BASE]: ornl() });
    const r = await answerChat({ message: "crop greenness Mandalay" }, { config: baseConfig(), fetchImpl: f, today: "2026-11-13" });
    expect(r.sections.current).toContain("MODIS NDVI");
    expect(r.answer).toMatch(/still being prepared/);
  });

  it("still answers when MODIS is down", async () => {
    const { f } = mockFetch({ "https://power.larc.nasa.gov": nasa, [BASE]: () => new Response("down", { status: 503 }) });
    const r = await answerChat({ message: "vegetation in Bago" }, { config: baseConfig(), fetchImpl: f, today: "2026-11-13" });
    expect(r.nasaDataAvailable).toBe(true);
    expect(r.answer).toMatch(/MODIS vegetation data \(NDVI\) could not be retrieved/);
  });

  it("does not call MODIS for unrelated environmental questions", async () => {
    const { f, calls } = mockFetch({ "https://power.larc.nasa.gov": nasa });
    await answerChat({ message: "wind speed in Yangon" }, { config: baseConfig(), fetchImpl: f, today: "2026-11-13" });
    expect(calls.some((c) => c.url.startsWith(BASE))).toBe(false);
  });
});

describe("NDVI comparison without the long-term POWER record", () => {
  it("still shows the NDVI past-year comparison when POWER history fails", async () => {
    const { f } = mockFetch({
      // recent window works, the 2009→ consistent-history request fails
      "https://power.larc.nasa.gov": (url: string) => (url.includes("start=2009") ? new Response("timeout", { status: 504 }) : Response.json(powerFromUrl(url))),
      [BASE]: ornl(),
    });
    await fetchNdviSummary(21.4, 95.95, 1000, f, BASE, "wait");
    const r = await answerChat({ message: "rice crops Mandalay" }, { config: baseConfig(), fetchImpl: f, today: "2026-11-13" });
    expect(r.sections.history).toContain("could not be retrieved");
    expect(r.sections.history).toContain("vegetation greenness (NDVI) is well above usual");
  });
});
