import { beforeEach, describe, expect, it, vi } from "vitest";
import { clearNdviCacheForTests, fetchNdviRange, NDVI_BAND } from "@/features/earthlens-chat/server/nasa/modis-ndvi";

beforeEach(clearNdviCacheForTests);

describe("vegetation chart observations", () => {
  it("uses only requested composite dates and leaves missing composites blank", async () => {
    const dates = [1,17,33].map((day, i) => ({modis_date:`A2026${String(day).padStart(3,"0")}`,calendar_date:["2026-01-01","2026-01-17","2026-02-02"][i]}));
    const fetcher = vi.fn(async (url: string | URL | Request) => Response.json(String(url).includes("/dates?") ? {dates} : {subset:[{band:NDVI_BAND,modis_date:"A2026001",calendar_date:"2026-01-01",data:[5000,-3000,7000]}]}));
    const result = await fetchNdviRange(16,96,"2026-01-01","2026-01-31",1000,fetcher as typeof fetch);
    expect(result).toEqual([{date:"2026-01-01",value:0.6},{date:"2026-01-17",value:null}]);
    expect(String(fetcher.mock.calls[1][0])).toContain("endDate=A2026017");
  });
  it("does not request a subset when the selected dates have no composites", async () => {
    const fetcher = vi.fn(async () => Response.json({dates:[]}));
    expect(await fetchNdviRange(16,96,"2026-01-01","2026-01-02",1000,fetcher)).toEqual([]);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
});
