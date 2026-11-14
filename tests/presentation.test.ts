import { beforeEach, describe, expect, it } from "vitest";
import { answerChat } from "@/features/earthlens-chat/server/handler";
import { clearPowerCacheForTests } from "@/features/earthlens-chat/server/nasa/power";
import { clearNdviCacheForTests } from "@/features/earthlens-chat/server/nasa/modis-ndvi";
import { buildActionCards, buildDataTable, tableText } from "@/features/earthlens-chat/server/presentation";
import { answerFormat } from "@/features/earthlens-chat/config/answer-format";
import type { Fact } from "@/features/earthlens-chat/types";
import type { Assessment } from "@/features/earthlens-chat/server/climate/assessment";
import { baseConfig, mockFetch, powerFromUrl, type SyntheticOpts } from "./fixtures";

const TODAY = "2026-11-13";
const nasa = (o: SyntheticOpts = {}) => (url: string) => Response.json(powerFromUrl(url, o));
const DRY = { overrideFrom: "2026-08-01", override: { PRECTOTCORR: 0, GWETROOT: 0.2 } };
const ask = async (message: string, o: SyntheticOpts = {}) => {
  const { f } = mockFetch({ "https://power.larc.nasa.gov": nasa(o), "https://modis.ornl.gov": () => new Response("down", { status: 503 }) });
  return answerChat({ message }, { config: baseConfig(), fetchImpl: f, today: TODAY });
};

beforeEach(() => {
  clearPowerCacheForTests();
  clearNdviCacheForTests();
});

const fact = (id: string, value: number, extra: Partial<Fact> = {}): Fact => ({ id, param: "rainfall", label: id, labelMy: id, value, unit: "mm", decimals: 1, source: "nasa-power-daily", kind: "observation", ...extra });
const assessment = (over: Partial<Assessment> = {}): Assessment => ({
  available: true, latestDate: "2026-11-10", baseline: { firstYear: 1981, lastYear: 2025 }, outlookWindow: { start: "2026-11-14", end: "2026-12-13" },
  facts: [], drought: "none", wet: "none", heat: "none", triggers: { drought: [], wet: [], heat: [] }, drySeasonAhead: false, drySeasonNow: false, ...over,
});

describe("NASA data table", () => {
  it("shows latest, typical past value and the calculated difference from real facts only", () => {
    const facts = [
      fact("rain_30d", 42.5, { period: { start: "2026-10-12", end: "2026-11-10" } }),
      fact("rain_30d_ref", 80, { kind: "comparison", period: { start: "2026-10-12", end: "2026-11-10" } }),
      fact("rain_30d_pct", 15, { kind: "comparison", unit: "percentile", decimals: 0 }),
      fact("rh_mean", 77, { param: "humidity", unit: "%", decimals: 0, period: { start: "2026-11-04", end: "2026-11-10" } }),
    ];
    const t = buildDataTable(facts, assessment(), { topics: [], decisions: [], asked: [], lang: "en" })!;
    const rain = t.rows.find((r) => r.param === "rainfall")!;
    expect(rain.latest).toEqual({ value: 42.5, unit: "mm", when: "2026-10-12 → 2026-11-10" });
    expect(rain.reference).toMatchObject({ value: 80, unit: "mm" });
    expect(rain.referenceLabel).toBe("median 1981–2025");
    expect(rain.difference).toEqual({ value: -37.5, unit: "mm" });
    expect(rain.rank).toBe(15);
    // humidity has no historical reference: no fabricated comparison
    const rh = t.rows.find((r) => r.param === "humidity")!;
    expect(rh.reference).toBeNull();
    expect(rh.difference).toBeNull();
    expect(tableText(t, "en")).toContain("| Relative humidity (7-day mean) | 77 % (2026-11-04 → 2026-11-10) | -- | -- |");
    // parameters without data are not shown at all
    expect(t.rows.some((r) => r.param === "temperature" || r.param === "soilWetness")).toBe(false);
  });

  it("shows at most 4 rows and uses Myanmar labels", () => {
    const facts = ["rain_30d", "soil_latest", "tmax_7d", "rh_mean", "wind_mean"].map((id) => fact(id, 1));
    const t = buildDataTable(facts, assessment(), { topics: [], decisions: [], asked: [], lang: "my" })!;
    expect(t.rows).toHaveLength(4);
    expect(t.rows[0].label).toBe("မိုးရေချိန် (ပြီးခဲ့သော ရက် ၃၀)");
    expect(tableText(t, "my")).toContain("| ကိန်းရှင် | နောက်ဆုံး တန်ဖိုး | ယခင်နှစ်များ ပုံမှန် | ကွာခြားချက် |");
  });

  it("returns no table when there is no data", () => {
    expect(buildDataTable([], assessment({ available: false }), { topics: [], decisions: [], asked: [], lang: "en" })).toBeNull();
  });
});

describe("Evidence-Based Action Cards", () => {
  it("every card has all five fields and evidence references to real facts", async () => {
    const r = await ask("Is there drought risk for rice farmers in Magway?", DRY);
    expect(r.actionCards.length).toBeGreaterThan(0);
    const ids = new Set(r.facts.map((f) => f.id));
    for (const c of r.actionCards) {
      expect(c.observedChange.length).toBeGreaterThan(10);
      expect(c.potentialImpact.length).toBeGreaterThan(10);
      expect(c.suggestedOptions.length).toBeGreaterThan(0);
      expect(c.evidenceNeeded.length).toBeGreaterThan(0);
      expect(["high", "moderate", "low", "insufficient"]).toContain(c.confidence.level);
      expect(c.confidence.reason.length).toBeGreaterThan(10);
      expect(c.evidenceRefs.length).toBeGreaterThan(0);
      for (const ref of c.evidenceRefs) expect(ids.has(ref), ref).toBe(true);
    }
  });

  it("omits cards and says so when there is no evidence", () => {
    const out = buildActionCards({ facts: [], a: assessment({ available: false }), topics: ["drought"], decisions: ["water"], lang: "en", today: TODAY });
    expect(out.cards).toHaveLength(0);
    expect(out.note).toBe("Insufficient evidence to generate a reliable action recommendation.");
  });

  it("does not create generic cards for an ordinary question with normal conditions", async () => {
    const r = await ask("wind speed in Yangon");
    expect(r.actionCards).toHaveLength(0);
    expect(r.actionNote).toMatch(/Insufficient evidence/);
  });

  it("water decisions ask for reservoir, river and demand data and are never High confidence", async () => {
    const r = await ask("Should we change irrigation water distribution from the reservoir in Magway?", DRY);
    const w = r.actionCards.find((c) => c.decisionType === "water")!;
    expect(w).toBeDefined();
    expect(w.evidenceNeeded).toEqual(expect.arrayContaining(["Reservoir storage levels", "River water levels", "Irrigation demand"]));
    expect(w.confidence.level).not.toBe("high");
    expect(w.confidence.reason).toMatch(/NASA rainfall alone cannot decide water allocation/);
  });

  it("electricity decisions ask for operational data and stay Low confidence", async () => {
    const r = await ask("How will hydropower electricity supply in Mandalay be affected?");
    const e = r.actionCards.find((c) => c.decisionType === "electricity")!;
    expect(e).toBeDefined();
    expect(e.evidenceNeeded).toEqual(expect.arrayContaining(["Actual electricity demand", "Power generation capacity", "Grid conditions"]));
    expect(e.confidence.level).toBe("low");
    expect(e.potentialImpact).toMatch(/cannot show electricity demand/);
  });

  it("disaster decisions require official warnings and river data and never order evacuation", async () => {
    const r = await ask("Do we need to evacuate because of flooding in Ayeyarwady?", { overrideFrom: "2026-10-20", override: { PRECTOTCORR: 120, GWETROOT: 0.99 } });
    const d = r.actionCards.find((c) => c.decisionType === "disaster")!;
    expect(d).toBeDefined();
    expect(d.evidenceNeeded).toEqual(expect.arrayContaining(["Official DMH flood and weather warnings", "River levels and flood-gauge readings"]));
    expect(d.suggestedOptions.join(" ")).toMatch(/cannot issue evacuation orders/);
    expect(d.confidence.reason).toMatch(/not an official warning/);
  });

  it("confidence is a category with a reason, never a percentage", async () => {
    const r = await ask("drought risk for crops in Magway", DRY);
    for (const c of r.actionCards) expect(c.confidence.reason).not.toMatch(/\d+\s*%/);
  });

  it("Myanmar cards use the Myanmar labels and the disclaimer stays last", async () => {
    const r = await ask("မကွေးတိုင်းဒေသကြီးရှိ စပါးတောင်သူများအတွက် မိုးခေါင်နိုင်ခြေ ရှိပါသလား", DRY);
    expect(r.lang).toBe("my");
    expect(r.actionCards.length).toBeGreaterThan(0);
    expect(r.sections.actions).toContain("တွေ့ရှိထားသော ပြောင်းလဲမှု");
    expect(r.sections.actions).toContain("ထပ်မံလိုအပ်သော အထောက်အထား");
    expect(r.sections.actions).toContain("ယုံကြည်စိတ်ချရမှု");
    expect(r.answer.endsWith(answerFormat.disclaimer.my)).toBe(true);
  });
});

describe("shorter answers", () => {
  it("keeps historical and outlook sections to a few lines", async () => {
    const r = await ask("How are crops in Mandalay?");
    expect(r.sections.history.split("\n").length).toBeLessThanOrEqual(3);
    expect(r.sections.outlook.split("\n").length).toBeLessThanOrEqual(4);
    expect(r.dataTable!.rows.length).toBeLessThanOrEqual(4);
    expect(r.answer.endsWith(answerFormat.disclaimer.en)).toBe(true);
  });
});
