import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchPublicModis, publicModisValue } from "@/features/explorer/server/modis-products";
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
