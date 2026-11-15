import { afterEach, describe, expect, it, vi } from "vitest";
import { addDays, clearPowerCacheForTests } from "@/features/earthlens-chat/server/nasa/power";
import { resetConfigForTests } from "@/features/earthlens-chat/server/env";
import {
  BASELINE_LABEL, ClimatePeriodError, REFERENCE, droughtBlend, droughtCategory, extremeRainfallDays, fetchClimateIndicator, hotDayThreshold, hotDays, monthsBetween, wetDayThreshold,
} from "@/features/explorer/server/climate-indicators";
import { POWER_BREAK_PARAMETERS, crossesPowerBreak } from "@/features/earthlens-chat/server/nasa/power-homogeneity";
import { FIRST_YEAR, MIN_PAST_YEARS, computeAssessment } from "@/features/earthlens-chat/server/climate/assessment";
import { publicModisValue, landCoverShares, fetchLandCoverClasses, fetchPublicModis, subsetWindow, windowCoverageText } from "@/features/explorer/server/modis-products";
import { areaAverageBasis, pointBasis, windowBasis } from "@/features/explorer/spatial-basis";
import { DATASETS } from "@/features/explorer/catalog";
import { POST } from "@/app/api/explore/observations/route";
import { powerFromUrl } from "./fixtures";

afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); resetConfigForTests(); clearPowerCacheForTests(); });

/** Daily map over [from, to] with values from `f`. */
function series(to: string, f: (date: string, i: number) => number | undefined, from = "2009-01-01") {
  const m = new Map<string, number>();
  let i = 0;
  for (let d = from; d <= to; d = addDays(d, 1), i++) { const v = f(d, i); if (v !== undefined) m.set(d, v); }
  return m;
}
/** POWER-shaped JSON for the URL's range, with values from `f(date, code)`. */
function powerResponse(url: string, f: (date: string, code: string, i: number) => number) {
  const q = new URL(url).searchParams;
  const iso = (s: string) => `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6)}`;
  const codes = q.get("parameters")!.split(",");
  const parameter: Record<string, Record<string, number>> = Object.fromEntries(codes.map(c => [c, {}]));
  let i = 0;
  for (let d = iso(q.get("start")!); d <= iso(q.get("end")!); d = addDays(d, 1), i++) for (const c of codes) parameter[c][d.replaceAll("-", "")] = f(d, c, i);
  return Response.json({ properties: { parameter }, parameters: Object.fromEntries(codes.map(c => [c, { units: c === "PRECTOTCORR" ? "mm/day" : "" }])) });
}
const request = (body: unknown) => new Request("http://localhost/api/explore/observations", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });

describe("NASA POWER 2008 discontinuity handling", () => {
  it("uses a fixed, labelled provisional 2009–2025 baseline", () => {
    expect(REFERENCE).toEqual({ firstYear: 2009, lastYear: 2025 });
    expect(BASELINE_LABEL).toBe("provisional 17-year post-2008 baseline (2009–2025), not a standard 30-year climate normal");
    expect(["PRECTOTCORR", "GWETROOT", "T2M_MAX"].every(p => POWER_BREAK_PARAMETERS.has(p))).toBe(true);
    expect(crossesPowerBreak(["PRECTOTCORR"], "2007-06-01")).toBe(true);
    expect(crossesPowerBreak(["PRECTOTCORR"], "2009-01-01")).toBe(false);
    expect(crossesPowerBreak(["ALLSKY_SFC_SW_DWN"], "2001-01-01")).toBe(false);
  });

  it("ignores pre-2009 values when setting the wet-day threshold", () => {
    const post = series("2025-12-31", (_, i) => (i % 10 === 0 ? (i / 10) % 20 + 1 : 0));
    const withPreBreak = new Map([...series("2008-12-31", () => 500, "1991-01-01"), ...post]);
    expect(wetDayThreshold(withPreBreak)).toBe(wetDayThreshold(post));
    expect(wetDayThreshold(post)!).toBeGreaterThan(18);
  });

  it("counts extreme-rain days and leaves incomplete months blank, not zero", () => {
    const rain = series("2025-12-31", (_, i) => (i % 10 === 0 ? (i / 10) % 20 + 1 : 0));
    rain.set("2024-06-03", 50); rain.set("2024-06-04", 60);
    expect(extremeRainfallDays(rain, ["2024-06-01"]).observations[0].value).toBeGreaterThanOrEqual(2);
    const partial = series("2024-06-10", (_, i) => (i % 10 === 0 ? 5 + (i % 7) : 0));
    expect(extremeRainfallDays(partial, ["2024-06-01"]).observations[0].value).toBeNull();
  });

  it("applies a day-of-year 90th-percentile hot-day threshold from the baseline only", () => {
    const tmax = series("2025-12-31", (d, i) => 30 + 5 * Math.sin((Number(d.slice(5, 7)) / 12) * 2 * Math.PI) + ((i * 7) % 10) / 10);
    const t = hotDayThreshold(tmax, "2024-04-15")!;
    const hotterPreBreak = new Map([...series("2008-12-31", () => 45, "1991-01-01"), ...tmax]);
    expect(hotDayThreshold(hotterPreBreak, "2024-04-15")).toBe(t);
    for (let d = "2024-04-01"; d <= "2024-04-30"; d = addDays(d, 1)) tmax.set(d, t + 1);
    expect(hotDays(tmax, ["2024-04-01"])[0].value).toBe(30);
  });

  it("blends rainfall and soil percentiles and reports only resolvable drought bands", () => {
    const rain = series("2025-12-31", (d) => (d.startsWith("2025") ? 0.1 : 3 + Number(d.slice(2, 4)) % 5));
    const soil = series("2025-12-31", (d) => (d.startsWith("2025") ? 0.2 : 0.6));
    const [obs] = droughtBlend(rain, soil, ["2025-06-01"]);
    // 2025 is itself a baseline year (mid-rank), so the driest year scores just above 0.
    expect(obs.components!.rainfall3MonthPercentile!).toBeLessThan(5);
    expect(obs.components!.rootZoneWetnessPercentile!).toBeLessThan(5);
    expect(droughtCategory(0)).toBe("drier than every year in the 2009–2025 baseline");
    expect(droughtCategory(8)).toBe("severely dry (≤10th percentile)");
    expect(droughtCategory(50)).toBe("no drought signal");
    for (const p of [0, 1, 2, 3, 4, 5]) expect(droughtCategory(p)).not.toMatch(/D3|D4|extreme|exceptional/);
  });

  it("requests NASA POWER from 2009 only and documents the provisional baseline", async () => {
    const fetcher = vi.fn(async (input: string | URL | Request) => powerResponse(String(input), (_, __, i) => (i % 9 === 0 ? 4 + (i % 13) : 0)));
    const result = await fetchClimateIndicator("extreme-rainfall-frequency", 16.8, 96.15, "2023-01-01", "2023-03-31", fetcher);
    const url = new URL(String(fetcher.mock.calls[0][0]));
    expect(url.searchParams.get("start")).toBe("20090101");
    expect(url.searchParams.get("end")).toBe("20251231");
    expect(result.observations.map(o => o.date)).toEqual(["2023-01-01", "2023-02-01", "2023-03-01"]);
    expect(result.observations.every(o => typeof o.value === "number")).toBe(true);
    expect(result.method).toContain("provisional 17-year post-2008 baseline (2009–2025), not a standard 30-year climate normal");
  });

  it("drops pre-2009 values even if the provider returns them", async () => {
    const make = (preBreak: number) => vi.fn(async (input: string | URL | Request) => {
      const res = await powerResponse(String(input), (d, _, i) => (i % 9 === 0 ? 4 + (i % 13) : 0)).json();
      for (let d = "2005-01-01"; d <= "2008-12-31"; d = addDays(d, 1)) res.properties.parameter.PRECTOTCORR[d.replaceAll("-", "")] = preBreak;
      return Response.json(res);
    });
    const a = await fetchClimateIndicator("extreme-rainfall-frequency", 16.81, 96.15, "2024-01-01", "2024-12-31", make(0));
    clearPowerCacheForTests();
    const b = await fetchClimateIndicator("extreme-rainfall-frequency", 16.81, 96.15, "2024-01-01", "2024-12-31", make(400));
    expect(b.observations).toEqual(a.observations);
    expect(b.method).toBe(a.method);
  });

  it("refuses periods that would need pre-2009 data", async () => {
    const fetcher = vi.fn();
    await expect(fetchClimateIndicator("hot-day-frequency", 16.8, 96.15, "2008-06-01", "2009-06-30", fetcher)).rejects.toBeInstanceOf(ClimatePeriodError);
    await expect(fetchClimateIndicator("drought-indicators", 16.8, 96.15, "2009-01-01", "2009-06-30", fetcher)).rejects.toThrow("first month 2009-03");
    expect(fetcher).not.toHaveBeenCalled();
    const res = await POST(request({ topicId: "disaster-intelligence", regionId: "yangon", datasetId: "extreme-rainfall-frequency", start: "2005-01-01", end: "2006-12-31" }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toContain("change abruptly during 2008");
  });

  it("documents the provisional baseline and the break in the catalogue", () => {
    for (const id of ["extreme-rainfall-frequency", "hot-day-frequency", "drought-indicators"]) {
      const d = DATASETS.find(x => x.id === id)!;
      expect(d.coverage!.start >= "2009-01-01", id).toBe(true);
      expect(d.limitations, id).toMatch(/provisional 17-year|provisional 2009–2025/);
      expect(d.limitations, id).toContain("2008");
      expect(JSON.stringify(d), id).not.toContain("1991");
    }
    for (const id of ["rainfall", "air-temperature", "root-zone-wetness", "disaster-rainfall", "water-rainfall"]) {
      expect(DATASETS.find(x => x.id === id)!.limitations, id).toContain("change abruptly during 2008");
    }
  });
});

describe("chatbot climate assessment uses the consistent record", () => {
  const ctx = (pre: boolean) => {
    const from = pre ? "1991-01-01" : "2009-01-01";
    // Values depend on the date only, so post-2009 data are identical in both cases.
    const day = (d: string) => Number(d.slice(8, 10)) + Number(d.slice(2, 4));
    const rain = series("2026-11-10", (d) => (d < "2009-01-01" ? 0 : Number(d.slice(5, 7)) >= 5 && Number(d.slice(5, 7)) <= 10 ? (day(d) % 3 ? 12 : 0) : (day(d) % 9 ? 0 : 3)), from);
    const soil = series("2026-11-10", (d) => (d < "2009-01-01" ? 0.1 : 0.6 + (day(d) % 7) / 100), from);
    const tmax = series("2026-11-10", (d) => (d < "2009-01-01" ? 45 : 31 + (day(d) % 5) / 2), from);
    return { rain, soil, tmax, latest: "2026-11-10", today: "2026-11-13" };
  };
  it("produces identical results whether or not pre-2009 data are supplied", () => {
    const withPre = computeAssessment(ctx(true)), without = computeAssessment(ctx(false));
    expect(withPre.facts).toEqual(without.facts);
    expect(withPre.drought).toBe(without.drought);
    expect(withPre.baseline).toEqual({ firstYear: 2009, lastYear: without.baseline!.lastYear });
    expect(FIRST_YEAR).toBe(2009);
    expect(MIN_PAST_YEARS).toBe(15);
    expect(without.facts.find(f => f.id === "heavy_threshold")?.label).toContain("since 2009");
    expect(without.facts.some(f => f.id === "rain_30d_pct" || f.id === "rain_90d_pct" || f.id === "soil_pct")).toBe(true);
  });
});

describe("spatial basis labels", () => {
  it("labels points, pixel windows and genuine full-area averages distinctly", () => {
    expect(pointBasis({ lat: 21.52, lon: 98.16, type: "region" }).label).toBe("Regional Reference Point (21.5200°N, 98.1600°E)");
    expect(pointBasis({ lat: 20.82711, lon: 95.748963, type: "township" }).label).toBe("Township Representative Point (20.8271°N, 95.7490°E)");
    expect(windowBasis({ lat: 21.52, lon: 98.16, type: "region" }, subsetWindow(500)).label).toBe("Regional Reference Point (21.5200°N, 98.1600°E) · 5 × 5 pixel window (about 2.3 km × 2.3 km)");
    expect(areaAverageBasis(true).label).toBe("Full Township Area Average");
    expect(areaAverageBasis(false).label).toBe("Full Region Area Average");
  });

  it("returns point labels and a break warning from the NASA POWER chart route", async () => {
    vi.stubGlobal("fetch", vi.fn(async (input: string | URL | Request) => Response.json(powerFromUrl(String(input)))));
    const region = await (await POST(request({ topicId: "agriculture", regionId: "yangon", datasetId: "rainfall", start: "2007-12-01", end: "2008-01-31" }))).json();
    expect(region.spatialBasis).toEqual({ kind: "point", label: "Regional Reference Point (17.1100°N, 96.1100°E)" });
    expect(region.dataWarning).toContain("change abruptly during 2008");
    expect(region.observations).toHaveLength(62);
    const township = await (await POST(request({ topicId: "agriculture", regionId: "mandalay", townshipId: "MMR010028", datasetId: "rainfall", start: "2024-01-01", end: "2024-01-31" }))).json();
    expect(township.spatialBasis.label).toMatch(/^Township Representative Point \(20\.\d{4}°N, 95\.\d{4}°E\)$/);
    expect(township.dataWarning).toBeUndefined();
    const solar = await (await POST(request({ topicId: "energy", regionId: "yangon", datasetId: "solar-radiation", start: "2005-01-01", end: "2005-01-31" }))).json();
    expect(solar.dataWarning).toBeUndefined();
  });
});

describe("NASA MODIS windows, land cover and burned area", () => {
  it("describes the 25-pixel window and what 0% burned area means", () => {
    expect(subsetWindow(500)).toEqual({ n: 5, pixels: 25, cellMeters: 463, sideKm: 2.3, areaKm2: 5.3, pixelSharePct: 4 });
    expect(subsetWindow(250).n).toBe(9);
    expect(subsetWindow(1000).n).toBe(3);
    const burned = windowCoverageText("burned-area", false);
    expect(burned).toContain("5 × 5 window of 463 m NASA MODIS pixels (25 pixels, about 2.3 km × 2.3 km");
    expect(burned).toContain("each pixel is about 4% of the window");
    expect(burned).toContain("0% means no burned pixels were detected in this window during that month; it does not mean the state/region had no fires");
    expect(windowCoverageText("land-cover", true)).toContain("not a township-wide average");
  });

  it("counts burned pixels only on valid land pixels", () => {
    // QA 3 = land + valid; QA 11 also has bits 0 and 1 set (seen in live NASA data); QA 1 = no valid data.
    expect(publicModisValue("burned", [75, 0, 0, 0, 120, -1], [3, 11, 3, 3, 1, 3])).toBe(25);
    expect(publicModisValue("burned", [0, 0], [3, 3])).toBe(0);
    expect(publicModisValue("burned", [-1, 50], [3, 1])).toBeNull();
  });

  it("keeps genuine 0% separate from unpublished or invalid months", async () => {
    const fetcher = vi.fn(async (input: string | URL | Request) => {
      if (String(input).includes("/dates?")) return Response.json({ dates: [{ calendar_date: "2024-03-01", modis_date: "A2024061" }, { calendar_date: "2024-04-01", modis_date: "A2024092" }] });
      return Response.json({ subset: [
        { calendar_date: "2024-03-01", modis_date: "A2024061", band: "Burn_Date", data: [0, 0, 0, 0] },
        { calendar_date: "2024-03-01", modis_date: "A2024061", band: "QA", data: [3, 3, 3, 3] },
        { calendar_date: "2024-04-01", modis_date: "A2024092", band: "Burn_Date", data: [-1, -1, -1, -1] },
        { calendar_date: "2024-04-01", modis_date: "A2024092", band: "QA", data: [0, 0, 0, 0] },
      ] });
    });
    // May 2024 is requested but not published: it is absent, never reported as 0%.
    expect(await fetchPublicModis("burned-area", 21.5201, 98.1601, "2024-03-01", "2024-05-31", fetcher)).toEqual([
      { date: "2024-03-01", value: 0 }, { date: "2024-04-01", value: null },
    ]);
  });

  it("accepts newly published NASA observations after the previously hard-coded end date", async () => {
    expect(DATASETS.find(d => d.id === "burned-area")!.coverage).toMatchObject({ end: "2026-08-31", ongoing: true });
    expect(DATASETS.find(d => d.id === "water-extent")!.coverage!.ongoing).toBe(false);
    vi.stubEnv("EARTH_ENGINE_PROJECT_ID", ""); vi.stubEnv("EARTH_ENGINE_SERVICE_ACCOUNT_JSON", "");
    vi.stubGlobal("fetch", vi.fn(async (input: string | URL | Request) => {
      if (String(input).includes("/dates?")) return Response.json({ dates: [{ calendar_date: "2026-09-01", modis_date: "A2026244" }] });
      return Response.json({ subset: [
        { calendar_date: "2026-09-01", modis_date: "A2026244", band: "Burn_Date", data: [250, 0, 0, 0] },
        { calendar_date: "2026-09-01", modis_date: "A2026244", band: "QA", data: [3, 3, 3, 3] },
      ] });
    }));
    const res = await POST(request({ topicId: "disaster-intelligence", regionId: "kayah", datasetId: "burned-area", start: "2026-09-01", end: "2026-09-30" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.observations).toEqual([{ date: "2026-09-01", value: 25 }]);
    expect(body.spatialBasis.kind).toBe("pixel-window");
    expect(body.geographicCoverage).toContain("0% means no burned pixels were detected in this window");
  });

  it("summarises IGBP class shares and follows the period's dominant class", async () => {
    expect(landCoverShares([12, 12, 13, 255, 14])).toEqual({ "Cropland": 50, "Urban and built-up": 25, "Cropland/natural vegetation mosaic": 25 });
    const fetcher = vi.fn(async (input: string | URL | Request) => {
      if (String(input).includes("/dates?")) return Response.json({ dates: [{ calendar_date: "2023-01-01", modis_date: "A2023001" }, { calendar_date: "2024-01-01", modis_date: "A2024001" }] });
      return Response.json({ subset: [
        { calendar_date: "2023-01-01", modis_date: "A2023001", band: "LC_Type1", data: [12, 12, 12, 13] },
        { calendar_date: "2024-01-01", modis_date: "A2024001", band: "LC_Type1", data: [12, 12, 13, 13] },
      ] });
    });
    const { years, dominant } = await fetchLandCoverClasses(20.1001, 96.1001, "2023-01-01", "2024-12-31", fetcher);
    expect(dominant).toBe("Cropland");
    expect(years.map(y => y.value)).toEqual([75, 50]);
  });

  it("marks all five indicators as available NASA datasets with sources and limitations", () => {
    for (const id of ["extreme-rainfall-frequency", "hot-day-frequency", "drought-indicators", "land-cover", "burned-area"]) {
      const d = DATASETS.find(x => x.id === id)!;
      expect(d.available, id).toBe(true);
      expect(d.source.name, id).toMatch(/NASA/);
      expect(d.source.url, id).toMatch(/^https:\/\//);
    }
  });
});

it("still lists calendar months overlapping a period", () => {
  expect(monthsBetween("2024-01-15", "2024-03-02")).toEqual(["2024-01-01", "2024-02-01", "2024-03-01"]);
});
