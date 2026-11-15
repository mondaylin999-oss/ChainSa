import { afterEach, describe, expect, it, vi } from "vitest";
import { DATASETS, TOPICS } from "@/features/explorer/catalog";
import { SATELLITE_PRODUCTS } from "@/features/explorer/satellite-products";
import { earthEngineConfigured, parseSatelliteRows } from "@/features/explorer/server/earth-engine";
import { GET } from "@/app/api/explore/catalog/route";
import { POST } from "@/app/api/explore/observations/route";

afterEach(() => vi.unstubAllEnvs());
describe("satellite data coverage", () => {
  it("assigns an actual dataset to every visible indicator", () => {
    for (const topic of TOPICS) for (const indicator of topic.indicators) {
      const matches = DATASETS.filter(dataset => dataset.id === indicator.datasetId && dataset.topicId === topic.id);
      expect(matches, `${topic.id}: ${indicator.label} (${indicator.datasetId})`).toHaveLength(1);
    }
    expect(new Set(DATASETS.map(dataset => dataset.id)).size).toBe(DATASETS.length);
  });
  it("gives each satellite dataset an applicable historical default period", () => {
    for (const product of Object.values(SATELLITE_PRODUCTS)) {
      expect(product.defaultStart >= product.start && product.defaultEnd <= product.end).toBe(true);
    }
    expect(SATELLITE_PRODUCTS["evapotranspiration"].band).toBe("ET");
    // The JRC water archive (non-NASA) was replaced by NASA MODIS water mapping.
    expect(SATELLITE_PRODUCTS["water-extent"]).toBeUndefined();
  });
  it("keeps missing and unobserved pixels separate from genuine zero values", () => {
    expect(parseSatelliteRows([{date:"2020-01-01",value:0,validAreaKm2:20},{date:"2021-01-01",value:null,validAreaKm2:null}])).toEqual([
      {date:"2020-01-01",value:0,validAreaKm2:20},{date:"2021-01-01",value:null,validAreaKm2:null},
    ]);
    expect(() => parseSatelliteRows({error:"failure"})).toThrow();
  });
  it("reports unfinished access accurately and does not attempt a raster request", async () => {
    vi.stubEnv("EARTH_ENGINE_PROJECT_ID", ""); vi.stubEnv("EARTH_ENGINE_SERVICE_ACCOUNT_JSON", "");
    expect(earthEngineConfigured()).toBe(false);
    const catalog = await (await GET()).json();
    const lights = catalog.datasets.find((dataset: {id:string}) => dataset.id === "nighttime-lights");
    expect(lights).toMatchObject({available:false,setupRequired:true,engine:"earth-engine"});
    expect(catalog.datasets.find((dataset: {id:string}) => dataset.id === "forest-cover")).toMatchObject({available:true});
    const result = await POST(new Request("https://localhost/api/explore/observations",{method:"POST",body:JSON.stringify({topicId:"energy",regionId:"yangon",datasetId:"nighttime-lights",start:"2020-01-01",end:"2024-12-31"})}));
    expect(result.status).toBe(503);
    expect((await result.json()).error).toContain("Google Earth Engine");
  });
});
