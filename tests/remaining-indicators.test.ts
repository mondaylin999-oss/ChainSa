import { afterEach, describe, expect, it, vi } from "vitest";
import { resetConfigForTests } from "@/features/earthlens-chat/server/env";
import { ProviderError, fetchJson } from "@/features/explorer/server/http";
import { fetchPaceAod, parseAodSamples } from "@/features/explorer/server/pace-aod";
import { fetchReachSeries, nearestReach, parseHydrocron, reachType, swotObservations, type SwotRow } from "@/features/explorer/server/swot";
import { PIXEL_KM2, WATER_WINDOW, classifyWater, excessWaterKm2, isClear, referenceWater, waterAreaKm2, waterPersistence, type WaterComposite } from "@/features/explorer/server/modis-water";
import { BLACK_MARBLE, blackMarbleMonths } from "@/features/explorer/server/earth-engine";
import { DATASETS } from "@/features/explorer/catalog";
import { SATELLITE_PRODUCTS } from "@/features/explorer/satellite-products";
import { GET as getCatalog } from "@/app/api/explore/catalog/route";
import { POST } from "@/app/api/explore/observations/route";

afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); resetConfigForTests(); });
const request = (body: unknown) => new Request("http://localhost/api/explore/observations", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
const ms = (d: string) => Date.parse(`${d}T00:00:00Z`);

describe("shared NASA HTTP helper", () => {
  it("retries one gateway error, then reports a clear provider error", async () => {
    const flaky = vi.fn().mockResolvedValueOnce(new Response("", { status: 503 })).mockResolvedValueOnce(Response.json({ ok: 1 }));
    expect(await fetchJson("https://x.test/a", { provider: "NASA test", timeoutMs: 1000, fetchImpl: flaky, retryDelayMs: 1 })).toEqual({ ok: 1 });
    const down = vi.fn(async () => new Response("", { status: 502 }));
    await expect(fetchJson("https://x.test/b", { provider: "NASA test", timeoutMs: 1000, fetchImpl: down, retryDelayMs: 1 })).rejects.toThrow("NASA test is temporarily unavailable (HTTP 502)");
    expect(down).toHaveBeenCalledTimes(2);
    const bad = vi.fn(async () => new Response("", { status: 400 }));
    await expect(fetchJson("https://x.test/c", { provider: "NASA test", timeoutMs: 1000, fetchImpl: bad })).rejects.toBeInstanceOf(ProviderError);
    expect(bad).toHaveBeenCalledTimes(1);
  });
  it("reports timeouts without retrying", async () => {
    const slow = vi.fn(async () => { const e = new Error("t"); e.name = "TimeoutError"; throw e; });
    await expect(fetchJson("https://x.test/d", { provider: "NASA test", timeoutMs: 5000, fetchImpl: slow })).rejects.toThrow("did not respond within 5 seconds");
    expect(slow).toHaveBeenCalledTimes(1);
  });
});

describe("NASA PACE OCI aerosol optical depth", () => {
  const sample = (date: string, value: string) => ({ value, attributes: { stdtime: ms(date) } });
  it("dates each 8-day composite by its first day and keeps missing cells blank", () => {
    const parsed = parseAodSamples({ samples: [sample("2025-01-09", "0.0921"), sample("2025-01-01", "0.16"), sample("2025-01-17", "NoData"), sample("2024-12-24", "0.2")] }, "2025-01-01", "2025-01-31");
    expect(parsed).toEqual([{ date: "2025-01-01", value: 0.16 }, { date: "2025-01-09", value: 0.092 }, { date: "2025-01-17", value: null }]);
    expect(parseAodSamples({ error: { details: ["No resource could be found at that address."] } }, "2025-01-01", "2025-01-31")).toEqual([]);
    expect(() => parseAodSamples({ unexpected: true }, "2025-01-01", "2025-01-31")).toThrow(ProviderError);
  });
  it("requests the selected period from the NASA GES DISC service", async () => {
    const fetcher = vi.fn(async (_input: string | URL | Request) => Response.json({ samples: [sample("2025-03-06", "0.265")] }));
    expect(await fetchPaceAod(16.85, 96.16, "2025-03-01", "2025-03-31", fetcher)).toEqual([{ date: "2025-03-06", value: 0.265 }]);
    const url = new URL(String(fetcher.mock.calls[0][0]));
    expect(url.pathname).toContain("/GESDISC/PACE_OCI_L3M_AOD/ImageServer/getSamples");
    expect(url.searchParams.get("time")).toBe(`${ms("2025-03-01")},${ms("2025-03-31") + 86_400_000 - 1}`);
  });
});

describe("NASA SWOT river and reservoir reaches", () => {
  const feature = (id: string, coords: number[][], river = "Irrawaddy") => ({ type: "Feature", properties: { reach_id: id, river_name: river }, geometry: { type: "LineString", coordinates: coords } });
  it("reads the SWORD reach type and picks the nearest reach of that type", () => {
    expect([reachType("44583000081"), reachType("44581600133"), reachType("44581600134")]).toEqual(["river", "lake-on-river", "other"]);
    const payload = { features: [feature("44583000081", [[96.2, 22.0]]), feature("44585000031", [[96.1, 21.97]]), feature("44581600133", [[96.09, 21.97]], "no_data")] };
    expect(nearestReach(payload, 21.9756, 96.095, "river")).toMatchObject({ reachId: "44585000031", riverName: "Irrawaddy" });
    expect(nearestReach(payload, 21.9756, 96.095, "lake-on-river")).toMatchObject({ reachId: "44581600133", riverName: null });
    expect(nearestReach({ features: [] }, 21, 96, "river")).toBeNull();
  });
  it("drops unobserved passes and fill values from Hydrocron CSV", () => {
    const csv = "reach_id,time_str,wse,width,slope,dschg_c,area_total,reach_q,partial_f,ice_clim_f,river_name\n" +
      "1,2024-01-18T19:39:51Z,59.75,1308.2,6.5e-05,-999999999999.0,-999999999999.0,2,0,0,Irrawaddy\n" +
      "1,no_data,-999999999999.0,-999999999999.0,-999999999999.0,-999999999999.0,-999999999999.0,3,1,0,Irrawaddy\n";
    const rows = parseHydrocron({ results: { csv } });
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ time: "2024-01-18T19:39:51Z", wse: 59.75, dschg_c: null, area_total: null, reach_q: 2 });
  });
  it("applies the quality rule, converts units and averages same-day passes without interpolating", () => {
    const row = (time: string, over: Partial<SwotRow>): SwotRow => ({ time, wse: 60, width: 1000, slope: 7e-5, dschg_c: null, area_total: 5_000_000, reach_q: 1, partial_f: 0, ice_clim_f: 0, river_name: "Mone River", ...over });
    const rows = [row("2024-01-01T01:00:00Z", { wse: 60 }), row("2024-01-01T13:00:00Z", { wse: 62 }), row("2024-01-20T01:00:00Z", { reach_q: 3 }), row("2024-02-10T01:00:00Z", { partial_f: 1 })];
    const wse = swotObservations(rows, "river-water-surface-elevation");
    expect(wse.observations.map(o => [o.date, o.value])).toEqual([["2024-01-01", 61], ["2024-01-20", null], ["2024-02-10", null]]);
    expect(wse.excluded).toBe(2);
    expect(swotObservations([row("2024-01-01T00:00:00Z", {})], "river-surface-slope").observations[0].value).toBe(7); // 7e-5 m/m = 7 cm/km
    expect(swotObservations([row("2024-01-01T00:00:00Z", {})], "reservoir-surface-area").observations[0].value).toBe(5); // 5e6 m² = 5 km²
    expect(swotObservations([row("2024-01-01T00:00:00Z", {})], "river-discharge").observations[0].value).toBeNull();
  });
  it("treats Hydrocron 'not found' as no passes rather than an error", async () => {
    const fetcher = vi.fn(async () => Response.json({ error: "400: Results with the specified Feature ID 1 were not found" }, { status: 400 }));
    expect(await fetchReachSeries("44583000081", "2022-01-01", "2022-02-01", fetcher)).toEqual([]);
  });
});

describe("NASA MODIS surface water and flood extent", () => {
  it("accepts only clear, snow-free MOD09A1 pixels", () => {
    expect(isClear(0)).toBe(true);
    expect(isClear(1)).toBe(false);          // cloudy
    expect(isClear(1 << 2)).toBe(false);     // shadow
    expect(isClear(1 << 8)).toBe(true);      // small cirrus
    expect(isClear(2 << 8)).toBe(false);     // average cirrus
    expect(isClear(1 << 12)).toBe(false);    // snow
    expect(isClear(65535)).toBe(false);      // fill
  });
  it("classifies water with MNDWI > 0 and leaves invalid pixels unknown", () => {
    // green, SWIR1: water reflects more green than SWIR; land the opposite.
    expect(classifyWater([800, 600, 700, -28672], [200, 1500, 700, 300], [0, 0, 1, 0])).toEqual([1, 0, null, null]);
  });
  it("keeps genuine 0 km² separate from cloudy composites", () => {
    const n = 10;
    const dry: WaterComposite = { date: "2024-03-05", pixels: Array(n).fill(0), clearShare: 1 };
    const cloudy: WaterComposite = { date: "2024-07-11", pixels: [1, 1, ...Array(n - 2).fill(null)], clearShare: 0.2 };
    expect(waterAreaKm2(dry)).toBe(0);
    expect(waterAreaKm2(cloudy)).toBeNull();
    expect(waterAreaKm2({ date: "x", pixels: [1, 1, 1, 0, 0, 0, 0, 0, 0, 0], clearShare: 1 })).toBe(Number((3 * PIXEL_KM2).toFixed(2)));
  });
  it("separates persistent from seasonal water across a period", () => {
    const c = (pixels: (0 | 1 | null)[]): WaterComposite => ({ date: "d", pixels, clearShare: 1 });
    const p = waterPersistence([c([1, 1, 0]), c([1, 0, 0]), c([1, 1, 0]), c([1, 0, null])]);
    expect(p).toEqual({ persistentKm2: Number(PIXEL_KM2.toFixed(2)), seasonalKm2: Number(PIXEL_KM2.toFixed(2)), observedPixels: 3, pixels: 3 });
  });
  it("counts only water outside the dry-season reference, and never reports zero for cloud", () => {
    const c = (pixels: (0 | 1 | null)[]): WaterComposite => ({ date: "d", pixels, clearShare: pixels.filter(x => x !== null).length / pixels.length });
    const reference = referenceWater([c([1, 0, 0, 0, 0]), c([1, 0, 0, 0, 0]), c([1, 0, 0, 0, 0])]);
    expect(reference).toEqual([1, 0, 0, 0, 0]);
    expect(excessWaterKm2(c([1, 1, 1, 0, 0]), reference)).toBe(Number((2 * PIXEL_KM2).toFixed(2)));
    expect(excessWaterKm2(c([1, 0, 0, 0, 0]), reference)).toBe(0);
    expect(excessWaterKm2(c([1, null, null, null, 0]), reference)).toBeNull();
    expect(excessWaterKm2(c([1, 1, 1, 0, 0]), [null, null, null, null, 0])).toBeNull();
  });
  it("uses a 21 × 21 pixel window of about 9.7 km", () => {
    expect(WATER_WINDOW).toMatchObject({ n: 21, pixels: 441, sideKm: 9.7 });
  });
});

describe("NASA Black Marble and catalogue integration", () => {
  it("documents the lit-area threshold and lists months", () => {
    expect(BLACK_MARBLE).toMatchObject({ collection: "NASA/VIIRS/002/VNP46A2", litThreshold: 0.5 });
    expect(blackMarbleMonths("2024-01-15", "2024-03-02")).toEqual(["2024-01-01", "2024-02-01", "2024-03-01"]);
  });
  it("has no duplicate datasets, replaces NOAA with NASA and labels JRC as non-NASA", () => {
    expect(new Set(DATASETS.map(d => d.id)).size).toBe(DATASETS.length);
    expect(SATELLITE_PRODUCTS["nighttime-lights"]).toBeUndefined();
    expect(JSON.stringify(DATASETS)).not.toMatch(/NOAA\/VIIRS/);
    expect(DATASETS.find(d => d.id === "nighttime-lights")!.source.name).toContain("NASA Black Marble VNP46A2");
    expect(DATASETS.find(d => d.id === "water-extent")!.limitations).toContain("Not a NASA dataset");
  });
  it("marks live indicators available and Earth Engine ones as needing setup, not as working", async () => {
    vi.stubEnv("EARTH_ENGINE_PROJECT_ID", ""); vi.stubEnv("EARTH_ENGINE_SERVICE_ACCOUNT_JSON", "");
    const catalog = await (await getCatalog()).json();
    const get = (id: string) => catalog.datasets.find((d: { id: string }) => d.id === id);
    for (const id of ["aerosol-optical-depth", "river-discharge", "river-water-surface-elevation", "river-width", "river-surface-slope", "reservoir-surface-area", "surface-water-area", "flood-extent"]) {
      expect(get(id), id).toMatchObject({ available: true });
      expect(get(id).source.name, id).toMatch(/NASA/);
    }
    for (const id of ["lit-area", "nighttime-lights"]) expect(get(id), id).toMatchObject({ available: false, setupRequired: true });
  });
});

describe("observation route for the new indicators", () => {
  it("returns AOD with a grid-cell basis", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ samples: [{ value: "0.3", attributes: { stdtime: ms("2025-02-02") } }] })));
    const body = await (await POST(request({ topicId: "environmental-change", regionId: "yangon", datasetId: "aerosol-optical-depth", start: "2025-02-01", end: "2025-02-28" }))).json();
    expect(body.observations).toEqual([{ date: "2025-02-02", value: 0.3 }]);
    expect(body.spatialBasis).toEqual({ kind: "grid-cell", label: "Regional Reference Point (17.1100°N, 96.1100°E) · 0.1° grid cell (about 11 km)" });
    expect(body.geographicCoverage).toContain("not ground-level PM2.5");
  });
  it("returns SWOT values with the reach identified, and explains missing discharge", async () => {
    vi.stubGlobal("fetch", vi.fn(async (input: string | URL | Request) => {
      const url = String(input);
      if (url.includes("gis.earthdata.nasa.gov")) return Response.json({ features: [{ properties: { reach_id: "44585000031", river_name: "Irrawaddy" }, geometry: { type: "LineString", coordinates: [[95.96, 21.41]] } }] });
      return Response.json({ results: { csv: "reach_id,time_str,wse,width,slope,dschg_c,area_total,reach_q,partial_f,ice_clim_f,river_name\n44585000031,2024-01-18T19:39:51Z,59.7,1473.9,6e-05,-999999999999.0,-999999999999.0,1,0,0,Irrawaddy\n" } });
    }));
    const width = await (await POST(request({ topicId: "water", regionId: "mandalay", datasetId: "river-width", start: "2024-01-01", end: "2024-06-30" }))).json();
    expect(width.observations).toEqual([{ date: "2024-01-18", value: 1473.9 }]);
    expect(width.spatialBasis.kind).toBe("river-reach");
    expect(width.spatialBasis.label).toContain("SWOT river reach 44585000031 (Irrawaddy)");
    const q = await (await POST(request({ topicId: "water", regionId: "mandalay", datasetId: "river-discharge", start: "2024-01-01", end: "2024-06-30" }))).json();
    expect(q.observations).toEqual([{ date: "2024-01-18", value: null }]);
    expect(q.geographicCoverage).toContain("SWOT has not computed a valid discharge estimate");
  });
  it("reports insufficient data when no SWOT reach is nearby, and refuses pre-2023 periods", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ features: [] })));
    const none = await POST(request({ topicId: "water", regionId: "chin", datasetId: "reservoir-surface-area", start: "2024-01-01", end: "2024-06-30" }));
    expect(none.status).toBe(404);
    expect((await none.json()).error).toContain("insufficient data");
    const early = await POST(request({ topicId: "water", regionId: "mandalay", datasetId: "river-width", start: "2020-01-01", end: "2021-01-01" }));
    expect(early.status).toBe(400);
  });
});

it("ignores SWOT reaches more than 16 km away even inside the search box", () => {
  const far = { features: [{ properties: { reach_id: "44584200353", river_name: "Zawgyi River" }, geometry: { type: "LineString", coordinates: [[96.43, 21.60]] } }] };
  expect(nearestReach(far, 21.576, 96.2712, "lake-on-river")).toBeNull();
});
