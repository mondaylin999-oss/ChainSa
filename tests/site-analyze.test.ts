import { describe, expect, it } from "vitest";
import { analyze, analyzeSchema, validateRange } from "@/features/earthlens-site/server/analyze";
import { addDays } from "@/features/earthlens-chat/server/nasa/power";
import { mockFetch, powerJson } from "./fixtures";

const today = new Date().toISOString().slice(0, 10);

describe("dashboard analyze", () => {
  it("uses the latest 7 days with valid data, skipping NASA POWER's -999 lag days", async () => {
    const start = addDays(today, -21);
    const { f, calls } = mockFetch({ "https://power.larc.nasa.gov": () => Response.json(powerJson(start, 22, { missingLast: 3 })) });
    const r = await analyze({ regionId: "mandalay", params: ["rainfall", "temperature", "humidity"], lang: "en" }, { fetchImpl: f });
    expect(calls[0].url).toContain("latitude=21.4000");
    expect(r.period.end).toBe(addDays(today, -3));
    expect(r.period.start).toBe(addDays(today, -9));
    expect(r.mode).toBe("live");
    expect(r.metrics.map((m) => m.param)).toEqual(["rainfall", "temperature", "humidity"]);
    expect(r.metrics[0].headline.unit).toBe("mm");
    expect(r.sources[0].url).toContain("power.larc.nasa.gov");
    expect(r.limitations.join(" ")).toMatch(/not a weather forecast/);
  });

  it("answers in Myanmar when asked", async () => {
    const { f } = mockFetch({ "https://power.larc.nasa.gov": () => Response.json(powerJson(addDays(today, -21), 22)) });
    const r = await analyze({ regionId: "yangon", params: ["rainfall"], lang: "my" }, { fetchImpl: f });
    expect(r.metrics[0].title).toBe("မိုးရေချိန်");
  });

  it("explains that fires need a FIRMS key instead of showing zero", async () => {
    const { f } = mockFetch({});
    const r = await analyze({ regionId: "shan", params: ["fires"], lang: "en" }, { fetchImpl: f });
    expect(r.metrics).toHaveLength(0);
    expect(r.limitations.join(" ")).toMatch(/FIRMS MAP_KEY/);
  });

  it("validates requests and date ranges", () => {
    expect(analyzeSchema.safeParse({ regionId: "atlantis", params: ["rainfall"] }).success).toBe(false);
    expect(analyzeSchema.safeParse({ regionId: "bago", params: [] }).success).toBe(false);
    expect(validateRange({ start: "2026-01-10", end: "2026-01-01" })).toMatch(/before/);
    expect(validateRange({ start: "2025-01-01", end: "2025-12-31" })).toMatch(/at most/);
    expect(validateRange({ start: addDays(today, -3), end: addDays(today, 5) })).toMatch(/future/);
    expect(validateRange({ start: "2026-01-01", end: "2026-01-31" })).toBeNull();
  });
});
