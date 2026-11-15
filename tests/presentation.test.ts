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

describe("Executive Summary (region · key findings · key recommendation)", () => {
  it("English: three-part summary first, then the six numbered detailed sections, disclaimer last", async () => {
    const r = await ask("Is there drought risk for rice farmers in Magway?", DRY);
    expect(r.answer.startsWith("Executive Summary\nRegion: Magway Region (named in your question)\n\nKey findings: ")).toBe(true);
    const order = ["Executive Summary", "Region:", "Key findings:", "Key recommendation:", "— Detailed Analysis —", "1. Current NASA Data", "2. Historical Comparison", "3. Next 30-Day Outlook", "4. Evidence-Based Action Cards", "5. Data Sources", "6. Disclaimer"];
    let pos = -1;
    for (const h of order) {
      const i = r.answer.indexOf(h);
      expect(i, h).toBeGreaterThan(pos);
      pos = i;
    }
    expect(r.answer.endsWith(answerFormat.disclaimer.en)).toBe(true);
  });

  it("returns the three parts as a structured field", async () => {
    const r = await ask("Is there drought risk for rice farmers in Magway?", DRY);
    const p = r.summaryParts!;
    expect(p.region).toBe("Magway Region (named in your question)");
    expect(p.regionSelected).toBe(true);
    expect(p.keyFindings.length).toBeGreaterThan(20);
    expect(p.recommendation.length).toBeGreaterThan(10);
  });

  it("key findings and recommendation only use values from the table and cards", async () => {
    const r = await ask("Is there drought risk for rice farmers in Magway?", DRY);
    const p = r.summaryParts!;
    const allowed = JSON.stringify({ t: r.dataTable, c: r.actionCards });
    for (const n of `${p.keyFindings} ${p.recommendation}`.match(/\d+(?:\.\d+)?/g) ?? []) expect(allowed, n).toContain(n);
    expect(p.keyFindings).toContain(r.dataTable!.rows[0].latest.value.toString());
    expect(p.recommendation.startsWith(r.actionCards[0].suggestedOptions[0].replace(/\.$/, ""))).toBe(true);
  });

  it("uses the map-selected region and says so", async () => {
    const { f } = mockFetch({ "https://power.larc.nasa.gov": nasa(), "https://modis.ornl.gov": () => new Response("down", { status: 503 }) });
    const r = await answerChat({ message: "How are crops doing?", selectedRegionId: "tanintharyi" }, { config: baseConfig(), fetchImpl: f, today: TODAY });
    expect(r.region!.id).toBe("tanintharyi");
    expect(r.summaryParts!.region).toBe("Tanintharyi Region (selected on the map)");
  });

  it("when the question names another region, shows both so the user is not confused", async () => {
    const { f } = mockFetch({ "https://power.larc.nasa.gov": nasa(), "https://modis.ornl.gov": () => new Response("down", { status: 503 }) });
    const r = await answerChat({ message: "drought in Magway?", selectedRegionId: "tanintharyi" }, { config: baseConfig(), fetchImpl: f, today: TODAY });
    expect(r.summaryParts!.region).toBe("Magway Region (named in your question; map selection: Tanintharyi)");
  });

  it("never guesses a region: no location → 'Location not selected yet' and no NASA calls", async () => {
    const { f, calls } = mockFetch({});
    const r = await answerChat({ message: "Is there a drought risk for my crops?" }, { config: baseConfig(), fetchImpl: f, today: TODAY });
    expect(r.kind).toBe("needs_region");
    expect(r.region).toBeNull();
    expect(r.summaryParts).toMatchObject({ region: "Location not selected yet", regionSelected: false });
    expect(r.summaryParts!.recommendation).toMatch(/Select a state or region on the map/);
    expect(calls).toHaveLength(0);
    expect(r.answer.endsWith(answerFormat.generalDisclaimer.en)).toBe(true);
  });

  it("Myanmar: no location → Myanmar message", async () => {
    const r = await answerChat({ message: "မိုးခေါင်နိုင်ခြေ ရှိပါသလား" }, { config: baseConfig(), today: TODAY });
    expect(r.summaryParts!.region).toBe("တည်နေရာ မရွေးချယ်ရသေးပါ");
    expect(r.answer.endsWith(answerFormat.generalDisclaimer.my)).toBe(true);
  });

  it("high-impact recommendation names the local data to check first", async () => {
    const r = await ask("Should we change irrigation water distribution from the reservoir in Magway?", DRY);
    expect(r.actionCards[0].decisionType).toBe("water");
    expect(r.summaryParts!.recommendation).toMatch(/check reservoir storage levels, river water levels before acting/);
  });

  it("Myanmar: three Myanmar paragraphs on top", async () => {
    const r = await ask("မကွေးတိုင်းဒေသကြီးရှိ စပါးတောင်သူများအတွက် မိုးခေါင်နိုင်ခြေ ရှိပါသလား", DRY);
    expect(r.answer.startsWith("အကျဉ်းချုပ်အဖြေ\nတိုင်းဒေသကြီး / ပြည်နယ်: မကွေးတိုင်းဒေသကြီး (သင့်မေးခွန်းတွင် ဖော်ပြထားသည်)")).toBe(true);
    expect(r.answer).toContain("\n\nအဓိကတွေ့ရှိချက်: ");
    expect(r.answer).toContain("\n\nအဓိကအကြံပြုချက်: ");
    expect(r.answer).toContain("— အသေးစိတ်အချက်အလက် —");
    expect(r.answer.endsWith(answerFormat.disclaimer.my)).toBe(true);
  });

  it("says evidence is insufficient (and what to ask) when no card can be made", async () => {
    const r = await ask("wind speed in Yangon");
    expect(r.summaryParts!.recommendation).toContain("Insufficient evidence to generate a reliable action recommendation.");
    expect(r.summaryParts!.recommendation).toContain("Ask about a specific decision");
  });
});

describe("follow-up questions", () => {
  it("accepts a long earlier answer in history (trimmed, not rejected)", async () => {
    const { handleChatPost, resetRateLimiterForTests } = await import("@/features/earthlens-chat/server/handler");
    resetRateLimiterForTests();
    const { f } = mockFetch({ "https://power.larc.nasa.gov": nasa(), "https://modis.ornl.gov": () => new Response("down", { status: 503 }) });
    const body = { message: "and what about soil?", selectedRegionId: "magway", history: [{ role: "user", content: "drought Magway?" }, { role: "assistant", content: "x".repeat(6000) }] };
    const res = await handleChatPost(new Request("http://localhost/api/chat", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }), { config: baseConfig(), fetchImpl: f, today: TODAY });
    expect(res.status).toBe(200);
  });
});

describe("AI safety fixes (Nov 2026 comparison)", () => {
  const keysCfg = (over = {}) =>
    baseConfig({
      openrouter: { name: "openrouter", apiKey: "or-test", baseUrl: "https://openrouter.test/api/v1", models: ["openrouter/free", "meta-llama/llama-3.3-70b-instruct:free"], rejectedModels: [] },
      groq: { name: "groq", apiKey: "gq-test", baseUrl: "https://groq.test/openai/v1", models: ["openai/gpt-oss-20b"], rejectedModels: [] },
      ...over,
    });
  const completion = (content: string) => Response.json({ model: "m", choices: [{ message: { content } }] });

  it("a rejected OpenRouter key (401) skips straight to Groq instead of trying another OpenRouter model", async () => {
    const { f, calls } = mockFetch({
      "https://power.larc.nasa.gov": nasa(),
      "https://openrouter.test": () => new Response("User not found", { status: 401 }),
      "https://groq.test": () => completion("Crops in Mandalay look fine."),
    });
    const r = await answerChat({ message: "crops in Mandalay" }, { config: keysCfg(), fetchImpl: f, today: TODAY });
    expect(calls.filter((c) => c.url.startsWith("https://openrouter.test"))).toHaveLength(1);
    expect(r.attempts[0].outcome).toBe("invalid_credentials");
    expect(r.provider).toBe("groq");
  });

  it("with AI_LANGUAGES=en (default), Myanmar answers use the template and no AI is called", async () => {
    const { f, calls } = mockFetch({ "https://power.larc.nasa.gov": nasa(), "https://openrouter.test": () => completion("x"), "https://groq.test": () => completion("x") });
    const r = await answerChat({ message: "မန္တလေးတိုင်းဒေသကြီးတွင် သီးနှံများအတွက် အခြေအနေ" }, { config: keysCfg({ aiLanguages: ["en"] }), fetchImpl: f, today: TODAY });
    expect(r.lang).toBe("my");
    expect(r.generator).toBe("template");
    expect(r.attempts.map((a) => a.outcome)).toEqual(["language_disabled"]);
    expect(calls.some((c) => c.url.includes(".test"))).toBe(false);
  });

  it("English still uses AI with AI_LANGUAGES=en", async () => {
    const { f } = mockFetch({ "https://power.larc.nasa.gov": nasa(), "https://openrouter.test": () => completion("Crops in Mandalay look fine.") });
    const r = await answerChat({ message: "crops in Mandalay" }, { config: keysCfg({ aiLanguages: ["en"] }), fetchImpl: f, today: TODAY });
    expect(r.generator).toBe("llm");
  });

  it("rejects AI text that calls conditions normal when the data is far from usual", async () => {
    // wet override → rainfall and soil wetness rank far above past years
    const wet = { overrideFrom: "2026-10-20", override: { PRECTOTCORR: 120, GWETROOT: 0.99 } };
    const { f } = mockFetch({
      "https://power.larc.nasa.gov": nasa(wet),
      "https://openrouter.test": () => completion("Rainfall and soil wetness are within normal ranges, so there is no flood signal."),
      "https://groq.test": () => completion("It has been much wetter than usual in Yangon."),
    });
    const r = await answerChat({ message: "flooding in Yangon?" }, { config: keysCfg(), fetchImpl: f, today: TODAY });
    expect(r.attempts[0].outcome).toBe("contradicts_data");
    expect(r.summaryParts!.keyFindings).not.toMatch(/within normal ranges/);
    expect(r.provider).toBe("groq");
  });

  it("rejects risk statements about the coming weeks (there is no validated forecast)", async () => {
    const { forbiddenClaims } = await import("@/features/earthlens-chat/server/verify");
    expect(forbiddenClaims("There is no drought risk for rice farmers in Magway in the next 30 days.")).not.toHaveLength(0);
    expect(forbiddenClaims("In the coming weeks there is low flood risk.")).not.toHaveLength(0);
    expect(forbiddenClaims("NASA data shows no drought signal for Magway right now.")).toHaveLength(0);
  });
});

describe("contradiction check wording", () => {
  it("allows correct comparisons and catches 'normal' claims", async () => {
    const { contradictsData } = await import("@/features/earthlens-chat/server/verify");
    const facts = [{ id: "rain_30d_pct", param: "rainfall", label: "", labelMy: "", value: 95, unit: "percentile", decimals: 0, source: "nasa-power-daily" }] as never[];
    expect(contradictsData("It has been much wetter than usual.", facts)).toBeNull();
    expect(contradictsData("Rainfall is far above usual for this season.", facts)).toBeNull();
    expect(contradictsData("Rainfall is within normal ranges.", facts)).not.toBeNull();
    expect(contradictsData("Conditions look as usual.", facts)).not.toBeNull();
    // no extreme ranks → nothing to contradict
    expect(contradictsData("Rainfall is within normal ranges.", [{ id: "rain_30d_pct", param: "rainfall", label: "", labelMy: "", value: 55, unit: "percentile", decimals: 0, source: "nasa-power-daily" }] as never[])).toBeNull();
  });
});
