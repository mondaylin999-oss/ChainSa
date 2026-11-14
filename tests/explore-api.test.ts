import { afterEach, describe, expect, it, vi } from "vitest";
import { clearPowerCacheForTests } from "@/features/earthlens-chat/server/nasa/power";
import { resetConfigForTests } from "@/features/earthlens-chat/server/env";
import { GET as getCatalog } from "@/app/api/explore/catalog/route";
import { POST as getObservations } from "@/app/api/explore/observations/route";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  resetConfigForTests();
  clearPowerCacheForTests();
});

describe("explore catalogue API", () => {
  it("reports township map coverage separately from regional observation coverage", async () => {
    const response = await getCatalog();
    const catalog = await response.json();
    expect(response.status).toBe(200);
    expect(catalog.townshipCoverage.available).toBe(true);
    expect(catalog.townshipCoverage.observationsAvailable).toBe(true);
    expect(catalog.townships).toHaveLength(330);
    expect(catalog.regions).toHaveLength(15);
    expect(catalog.datasets.find((dataset: { id: string }) => dataset.id === "rainfall")).toMatchObject({
      available: true,
      parameter: "PRECTOTCORR",
    });
  });
});

describe("explore observations API", () => {
  const request = (body: unknown) => new Request("http://localhost/api/explore/observations", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });

  it("rejects unavailable topics, unknown regions, and invalid dates without requesting live data", async () => {
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    const invalidBody = await getObservations(request(null));
    const wrongTopic = await getObservations(request({
      topicId: "environmental-change", regionId: "ayeyarwady", datasetId: "rainfall",
      start: "2026-01-01", end: "2026-01-02",
    }));
    const unknownRegion = await getObservations(request({
      topicId: "agriculture", regionId: "imaginary-township", datasetId: "rainfall",
      start: "2026-01-01", end: "2026-01-02",
    }));
    const invalidRange = await getObservations(request({
      topicId: "agriculture", regionId: "ayeyarwady", datasetId: "rainfall",
      start: "2026-02-01", end: "2026-01-02",
    }));
    expect(wrongTopic.status).toBe(400);
    expect(unknownRegion.status).toBe(400);
    expect(invalidRange.status).toBe(400);
    expect(invalidBody.status).toBe(400);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("fills omitted NASA observations as gaps and reports the regional reference point", async () => {
    vi.stubEnv("NASA_POWER_BASE_URL", "https://power.test/api/temporal");
    const fetch = vi.fn(async () => Response.json({
      header: { fill_value: -999 },
      properties: { parameter: { PRECTOTCORR: { "20260101": 3.2, "20260103": -999 } } },
      parameters: { PRECTOTCORR: { units: "mm/day" } },
    }));
    vi.stubGlobal("fetch", fetch);

    const response = await getObservations(request({
      topicId: "agriculture", regionId: "ayeyarwady", datasetId: "rainfall",
      start: "2026-01-01", end: "2026-01-03",
    }));
    const data = await response.json();
    expect(response.status).toBe(200);
    expect(data.observations).toEqual([
      { date: "2026-01-01", value: 3.2 },
      { date: "2026-01-02", value: null },
      { date: "2026-01-03", value: null },
    ]);
    expect(data.missingCount).toBe(2);
    expect(data.summary).toMatchObject({ count: 1, mean: 3.2, min: 3.2, max: 3.2 });
    expect(data.geographicCoverage).toContain("not a state/region-wide or township-wide average");
    expect(fetch).toHaveBeenCalledTimes(1);
  });
  it("accepts a multi-decade NASA POWER range and preserves missing days",async()=>{
    vi.stubGlobal("fetch",vi.fn(async()=>Response.json({properties:{parameter:{PRECTOTCORR:{19890101:2,20261114:3}}},parameters:{PRECTOTCORR:{units:"mm/day"}}})));
    const response=await getObservations(request({topicId:"agriculture",regionId:"yangon",datasetId:"rainfall",start:"1989-01-01",end:"2026-11-14"}));
    const data=await response.json();expect(response.status).toBe(200);expect(data.observations.length).toBeGreaterThan(13000);expect(data.summary.count).toBe(2);expect(data.observations[0]).toEqual({date:"1989-01-01",value:2});expect(data.observations.at(-1)).toEqual({date:"2026-11-14",value:3});
  });

});
