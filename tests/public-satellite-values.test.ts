import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchPublicModis, publicModisValue, urbanPixelMask } from "@/features/explorer/server/modis-products";
import { SATELLITE_PRODUCTS, urbanMaskYear } from "@/features/explorer/satellite-products";
import { DATASETS } from "@/features/explorer/catalog";
import { clearPublicFireCacheForTests, fetchPublicFires } from "@/features/explorer/server/public-fires";
import { getRegion } from "@/features/earthlens-chat/regions";

afterEach(() => { vi.useRealTimers(); clearPublicFireCacheForTests(); });
describe("public NASA satellite values", () => {
  it("rejects water/fill tree-cover values and preserves measured zero", () => {
    expect(publicModisValue("tree-cover",[0,50,100,200,253])).toBe(50);
    expect(publicModisValue("tree-cover",[200,253])).toBeNull();
  });
  it("converts surface temperature once and drops poor-quality pixels", () => {
    expect(publicModisValue("lst",[15000,15000,0],[0,192,0])).toBeCloseTo(26.85);
  });
  it("scales ET totals and rejects fill and backup-algorithm retrievals", () => {
    expect(publicModisValue("et",[100,200,32767],[0,1,0])).toBe(10);
  });
  it("compares land classes on matching valid pixels rather than averaging class IDs", () => {
    expect(publicModisValue("land-change",[13,12,255],[],[1,12,1])).toBe(50);
    expect(publicModisValue("built-change",[13,12],[],[1,12])).toBe(50);
    expect(publicModisValue("crop-change",[13,12],[],[1,12])).toBe(0);
    expect(publicModisValue("land-change",[13],[],[255])).toBeNull();
  });
  it("retrieves and combines MODIS science and quality bands from NASA", async () => {
    const fetcher = vi.fn(async (input: string | URL | Request) => {
      const url = String(input);
      if (url.includes("/dates?")) return Response.json({ dates: [{ calendar_date: "2020-01-01", modis_date: "A2020001" }] });
      return Response.json({ subset: [
        { calendar_date: "2020-01-01", modis_date: "A2020001", band: "LST_Day_1km", data: [15000] },
        { calendar_date: "2020-01-01", modis_date: "A2020001", band: "QC_Day", data: [0] },
      ] });
    });
    const observations = await fetchPublicModis("land-surface-temperature", 21.9012, 95.9012, "2020-01-01", "2020-01-01", fetcher);
    expect(observations).toEqual([{ date: "2020-01-01", value: 26.85 }]);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
  it("surfaces missing provider bands instead of returning a successful empty series", async () => {
    const fetcher = vi.fn(async (input: string | URL | Request) => String(input).includes("/dates?")
      ? Response.json({ dates: [{ calendar_date: "2020-01-01", modis_date: "A2020001" }] })
      : Response.json({ subset: [{ calendar_date: "2020-01-01", modis_date: "A2020001", band: "unexpected", data: [1] }] }));
    await expect(fetchPublicModis("land-surface-temperature", 21.9023, 95.9023, "2020-01-01", "2020-01-01", fetcher))
      .rejects.toThrow("expected LST_Day_1km band");
  });
  it("defines both urban indicators from NASA MODIS products with citations", () => {
    expect(SATELLITE_PRODUCTS["urban-vegetation"]).toMatchObject({ collection: "MODIS/061/MOD13Q1", metric: "urban-ndvi", scale: 250 });
    expect(SATELLITE_PRODUCTS["urban-surface-temperature"]).toMatchObject({ collection: "MODIS/061/MOD11A2", metric: "urban-lst", scale: 1000, unit: "°C" });
    for (const id of ["urban-vegetation", "urban-surface-temperature"]) {
      const dataset = DATASETS.find(d => d.id === id)!;
      expect(dataset).toMatchObject({ topicId: "infrastructure-urban-change", engine: "earth-engine", available: true });
      expect(dataset.source.name).toMatch(/NASA MODIS .*MCD12Q1/);
    }
    // NASA's published years decide: a 2025 map is used as soon as it is listed, with no hard-coded last year.
    expect([urbanMaskYear("2000-03-01", [2001, 2024]), urbanMaskYear("2019-06-01", [2018, 2019, 2024]), urbanMaskYear("2025-06-01", [2023, 2024])]).toEqual([2001, 2019, 2024]);
    expect(urbanMaskYear("2025-06-01", [2023, 2024, 2025])).toBe(2025);
  });
  it("averages NDVI and LST only over good-quality built-up pixels", () => {
    expect(publicModisValue("urban-ndvi", [5000, 3000, 8000, -3000], [0, 1, 3, 0], [], [true, true, true, true])).toBeCloseTo(0.4);
    expect(publicModisValue("urban-ndvi", [5000, 3000], [0, 0], [], [true, false])).toBeCloseTo(0.5);
    expect(publicModisValue("urban-ndvi", [5000], [0], [], [false])).toBeNull();
    expect(publicModisValue("urban-lst", [15000, 16000], [0, 0], [], [true, false])).toBeCloseTo(26.85);
  });
  it("aligns MODIS pixels to MCD12Q1 urban pixels using the subset grids", () => {
    const cover = { xll: 0, yll: 0, cellsize: 500, nrows: 2, ncols: 2 };
    // North-west land-cover pixel is urban (13); the rest are cropland (12).
    const classes = [13, 12, 12, 12];
    expect(urbanPixelMask(16, { xll: 0, yll: 0, cellsize: 250, nrows: 4, ncols: 4 }, classes, cover, "centre"))
      .toEqual([true, true, false, false, true, true, false, false, false, false, false, false, false, false, false, false]);
    expect(urbanPixelMask(1, { xll: 0, yll: 0, cellsize: 1000, nrows: 1, ncols: 1 }, classes, cover, "share")).toEqual([false]);
    expect(urbanPixelMask(1, { xll: 0, yll: 0, cellsize: 1000, nrows: 1, ncols: 1 }, [13, 13, 12, 255], cover, "share")).toEqual([true]);
  });
  it("retrieves NASA NDVI and land cover and reports urban greenness", async () => {
    const fetcher = vi.fn(async (input: string | URL | Request) => {
      const url = String(input);
      if (url.includes("/dates?")) return Response.json({ dates: [{ calendar_date: "2023-01-01", modis_date: "A2023001" }] });
      if (url.includes("/MCD12Q1/")) return Response.json({ xllcorner: "0", yllcorner: "0", cellsize: 500, nrows: 1, ncols: 2, subset: [
        { calendar_date: "2023-01-01", modis_date: "A2023001", band: "LC_Type1", data: [13, 12] },
      ] });
      return Response.json({ xllcorner: "0", yllcorner: "0", cellsize: 250, nrows: 1, ncols: 4, subset: [
        { calendar_date: "2023-01-01", modis_date: "A2023001", band: "250m_16_days_NDVI", data: [2000, 4000, 9000, 9000] },
        { calendar_date: "2023-01-01", modis_date: "A2023001", band: "250m_16_days_pixel_reliability", data: [0, 0, 0, 0] },
      ] });
    });
    const observations = await fetchPublicModis("urban-vegetation", 16.8001, 96.1501, "2023-01-01", "2023-01-01", fetcher);
    expect(observations).toEqual([{ date: "2023-01-01", value: 0.3 }]);
    expect(fetcher.mock.calls.map(c => String(c[0])).some(u => u.includes("MCD12Q1/subset") && u.includes("A2023001"))).toBe(true);
  });
  it("retries one NASA gateway error but reports a second one", async () => {
    let subsetCalls = 0;
    const fetcher = vi.fn(async (input: string | URL | Request) => {
      if (String(input).includes("/dates?")) return Response.json({ dates: [{ calendar_date: "2020-01-01", modis_date: "A2020001" }] });
      subsetCalls++;
      if (subsetCalls === 1) return new Response("<html>502 Proxy Error</html>", { status: 502 });
      return Response.json({ subset: [
        { calendar_date: "2020-01-01", modis_date: "A2020001", band: "LST_Day_1km", data: [15000] },
        { calendar_date: "2020-01-01", modis_date: "A2020001", band: "QC_Day", data: [0] },
      ] });
    });
    expect(await fetchPublicModis("land-surface-temperature", 21.9034, 95.9034, "2020-01-01", "2020-01-01", fetcher)).toEqual([{ date: "2020-01-01", value: 26.85 }]);
    expect(subsetCalls).toBe(2);
    const failing = vi.fn(async () => new Response("<html>503</html>", { status: 503 }));
    await expect(fetchPublicModis("land-surface-temperature", 21.9045, 95.9045, "2020-01-01", "2020-01-01", failing)).rejects.toThrow("temporarily unavailable");
    expect(failing).toHaveBeenCalledTimes(2);
  });
  it("loads the public fire feed and filters observations to a region boundary", async () => {
    vi.setSystemTime(new Date("2026-11-14T12:00:00Z"));
    const fetcher = vi.fn(async () => new Response("latitude,longitude,acq_date,acq_time,confidence\n17.11,96.11,2026-11-14,0900,nominal\n0,0,2026-11-14,0900,nominal"));
    const result = await fetchPublicFires(getRegion("yangon")!,undefined,fetcher);
    expect(result.detections).toHaveLength(1);
    expect(result.latestFeedDate).toBe("2026-11-14");
  });
  it("does not report zeros when the upstream fire feed is empty", async () => {
    await expect(fetchPublicFires(getRegion("yangon")!,undefined,async () => new Response("latitude,longitude,acq_date\n"))).rejects.toThrow("empty");
  });
});
