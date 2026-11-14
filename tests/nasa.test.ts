import { describe, expect, it } from "vitest";
import { parsePowerResponse } from "@/features/earthlens-chat/server/nasa/power";
import { buildGrounding, latestCompleteDate } from "@/features/earthlens-chat/server/grounding";
import { parseFirmsCsv, pointInGeometry, regionGeometry } from "@/features/earthlens-chat/server/nasa/firms";
import { getRegion } from "@/features/earthlens-chat/regions";
import { mockFetch, powerJson } from "./fixtures";

const CODES = ["PRECTOTCORR", "T2M", "T2M_MAX", "T2M_MIN", "RH2M", "WS10M", "WS10M_MAX", "GWETROOT"];

describe("NASA POWER parsing", () => {
  it("treats -999 fill values as missing and maps units", () => {
    const r = parsePowerResponse(powerJson("2026-11-01", 5, { missingLast: 2 }), CODES, "u");
    expect(r.series.PRECTOTCORR.at(-1)?.value).toBeNull();
    expect(r.units.T2M).toBe("°C");
    expect(r.units.GWETROOT).toBe("fraction (0–1)");
    expect(latestCompleteDate(r, CODES)).toBe("2026-11-03");
  });
  it("rejects an unexpected response", () => {
    expect(() => parsePowerResponse({ messages: ["bad"] }, CODES, "u")).toThrow(/Unexpected/);
  });
});

describe("grounding", () => {
  it("builds facts for the 7 latest complete days with dates and units", async () => {
    const { f, calls } = mockFetch({ "https://power.larc.nasa.gov": () => Response.json(powerJson("2026-10-14", 30, { missingLast: 3 })) });
    const g = await buildGrounding(getRegion("ayeyarwady")!, ["rainfall", "temperature", "wind"], "en", { fetchImpl: f, firmsMapKey: "", nasaTimeoutMs: 1000, today: "2026-11-13" });
    expect(calls[0].url).toContain("latitude=16.7500");
    expect(calls[0].url).toContain("start=20261014&end=20261112");
    expect(g.period).toEqual({ start: "2026-11-03", end: "2026-11-09" });
    const byId = Object.fromEntries(g.facts.map((x) => [x.id, x]));
    expect(byId.rain_max_day).toMatchObject({ value: 10.3, unit: "mm/day", date: "2026-11-06" });
    expect(byId.rain_days.value).toBe(4);
    expect(byId.temp_max.unit).toBe("°C");
    expect(g.sources[0].id).toBe("nasa-power-daily");
    expect(g.nasaDataAvailable).toBe(true);
  });
  it("reports failure honestly when NASA POWER is down", async () => {
    const { f } = mockFetch({ "https://power.larc.nasa.gov": () => new Response("down", { status: 503 }) });
    const g = await buildGrounding(getRegion("yangon")!, ["rainfall"], "en", { fetchImpl: f, firmsMapKey: "", nasaTimeoutMs: 1000, today: "2026-11-13" });
    expect(g.facts).toHaveLength(0);
    expect(g.nasaDataAvailable).toBe(false);
    expect(g.notes.join(" ")).toMatch(/could not be retrieved/);
  });
  it("skips fires without a FIRMS key and says so", async () => {
    const { f } = mockFetch({ "https://power.larc.nasa.gov": () => Response.json(powerJson("2026-10-14", 30)) });
    const g = await buildGrounding(getRegion("shan")!, ["fires"], "en", { fetchImpl: f, firmsMapKey: "", nasaTimeoutMs: 1000, today: "2026-11-13" });
    expect(g.facts.filter((x) => x.param === "fires")).toHaveLength(0);
    expect(g.notes.join(" ")).toMatch(/no NASA FIRMS key/);
  });
  it("counts FIRMS detections inside the region polygon only", async () => {
    const csv = "latitude,longitude,bright_ti4,scan,track,acq_date,acq_time,satellite,instrument,confidence,version,bright_ti5,frp,daynight\n" +
      "21.5,98.1,330,0.4,0.4,2026-11-12,0630,N,VIIRS,n,2.0NRT,290,5.1,D\n" + // inside Shan
      "16.8,96.1,330,0.4,0.4,2026-11-12,0630,N,VIIRS,n,2.0NRT,290,5.1,D\n"; // Yangon, outside Shan
    const { f, calls } = mockFetch({
      "https://power.larc.nasa.gov": () => Response.json(powerJson("2026-10-14", 30)),
      "https://firms.modaps.eosdis.nasa.gov": () => new Response(csv),
    });
    const g = await buildGrounding(getRegion("shan")!, ["fires"], "en", { fetchImpl: f, firmsMapKey: "TESTKEY", nasaTimeoutMs: 1000, today: "2026-11-13" });
    expect(calls.some((c) => c.url.includes("/VIIRS_SNPP_NRT/"))).toBe(true);
    expect(g.facts.find((x) => x.id === "fires_count")?.value).toBe(1);
  });
  it("parses FIRMS CSV and polygons", () => {
    expect(parseFirmsCsv("latitude,longitude,acq_date\n1,2,2026-01-01")).toHaveLength(1);
    expect(pointInGeometry(96.15, 17.1, regionGeometry("MM-06")!)).toBe(true);
    expect(pointInGeometry(98.1, 21.5, regionGeometry("MM-06")!)).toBe(false);
  });
});
