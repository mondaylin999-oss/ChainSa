import { beforeEach, describe, expect, it } from "vitest";
import { answerChat, handleChatPost, resetRateLimiterForTests } from "@/features/earthlens-chat/server/handler";
import { clearPowerCacheForTests } from "@/features/earthlens-chat/server/nasa/power";
import { answerFormat } from "@/features/earthlens-chat/config/answer-format";
import { baseConfig, completion, mockFetch, powerFromUrl, type SyntheticOpts } from "./fixtures";

const TODAY = "2026-11-13";
const nasa = (o: SyntheticOpts = {}) => (url: string) => Response.json(powerFromUrl(url, o));
const keys = (over = {}) =>
  baseConfig({
    openrouter: { name: "openrouter", apiKey: "or-test", baseUrl: "https://openrouter.test/api/v1", models: ["openrouter/free", "meta-llama/llama-3.3-70b-instruct:free"], rejectedModels: [] },
    groq: { name: "groq", apiKey: "gq-test", baseUrl: "https://groq.test/openai/v1", models: ["openai/gpt-oss-20b"], rejectedModels: [] },
    ...over,
  });
const EN_HEADINGS = ["Executive Summary", "— Detailed Analysis —", "1. Current NASA Data", "2. Historical Comparison", "3. Next 30-Day Outlook", "4. Evidence-Based Action Cards", "5. Data Sources", "6. Disclaimer"];
const MY_HEADINGS = [
  "အကျဉ်းချုပ်အဖြေ",
  "— အသေးစိတ်အချက်အလက် —",
  ...answerFormat.sections.filter((s) => s.id !== "summary").map((s, i) => `${i + 1}. ${s.heading.my}`),
];
const DISCLAIMER_EN = "The analysis and forecasts provided are based on NASA Earth observation data, relevant historical records, and the forecasting models used. They represent estimated future possibilities and do not guarantee actual future conditions.";
const DISCLAIMER_MY = "ဤအဖြေတွင် ဖော်ပြထားသော ခန့်မှန်းသုံးသပ်ချက်များသည် NASA မှ ရရှိသော ကမ္ဘာမြေလေ့လာရေးအချက်အလက်များ၊ သက်ဆိုင်ရာ အတိတ်မှတ်တမ်းများနှင့် အသုံးပြုထားသော ခန့်မှန်းမော်ဒယ်များအပေါ် အခြေခံထားခြင်းဖြစ်ပါသည်။ ၎င်းတို့သည် ဖြစ်နိုင်ခြေကို ခန့်မှန်းသုံးသပ်ထားခြင်းသာဖြစ်ပြီး အမှန်တကယ် ဖြစ်ပေါ်လာမည်ဟု အာမခံခြင်း မဟုတ်ပါ။";

const inOrder = (text: string, parts: string[]) => {
  let pos = -1;
  for (const p of parts) {
    const i = text.indexOf(p);
    expect(i, `missing or out of order: ${p}`).toBeGreaterThan(pos);
    pos = i;
  }
};

beforeEach(() => clearPowerCacheForTests());

describe("seven-section concise answer format", () => {
  it("English: all seven sections in order, exact disclaimer, no forecast claimed", async () => {
    const { f } = mockFetch({ "https://power.larc.nasa.gov": nasa() });
    const r = await answerChat({ message: "Is there drought risk for rice farmers in Ayeyarwady in the next 30 days?" }, { config: baseConfig(), fetchImpl: f, today: TODAY });
    inOrder(r.answer, EN_HEADINGS);
    expect(r.answer).toContain(DISCLAIMER_EN);
    expect(r.answer.endsWith(DISCLAIMER_EN)).toBe(true);
    expect(r.answer.startsWith("Executive Summary\nRegion: Ayeyarwady Region (named in your question)\n\nKey findings: For Ayeyarwady: ")).toBe(true);
    expect(r.summary).toBe(r.sections.summary);
    expect(r.sections.history).toMatch(/Compared with the same dates in past years \(2009–20\d\d\)/);
    expect(r.sections.current).toContain("Ayeyarwady — NASA grid point 16.75°N, 95.11°E");
    expect(r.sections.current).toContain("| Parameter | Latest value | Typical in past years | Difference |");
    expect(r.answer).toContain("A reliable 30-day forecast cannot be calculated yet");
    expect(r.answer).toContain("NOT a forecast");
    expect(r.answer).not.toMatch(/\d+\s*%\s*(chance|probability)/i);
    expect(r.outlook.forecastAvailable).toBe(false);
    expect(r.topics).toEqual(expect.arrayContaining(["drought", "agriculture"]));
    expect(r.outlook.historical.length).toBeGreaterThan(3);
    expect(r.outlook.historical.every((x) => x.kind === "historical")).toBe(true);
    expect(r.outlook.window).toEqual({ start: "2026-11-14", end: "2026-12-13" });
    expect(r.sections.sources).toContain("https://power.larc.nasa.gov/");
    expect(r.sections.sources).toMatch(/history 2009–20\d\d \(provisional post-2008 baseline/);
    expect(r.sections.sources).toContain("Forecasting model: none");
  });

  it("Myanmar: same seven sections in order and the exact Burmese disclaimer", async () => {
    const { f } = mockFetch({ "https://power.larc.nasa.gov": nasa() });
    const r = await answerChat({ message: "ရန်ကုန်မှာ လာမည့် ရက် ၃၀ အတွင်း ရေကြီးနိုင်ခြေ ရှိလား" }, { config: baseConfig(), fetchImpl: f, today: TODAY });
    expect(r.lang).toBe("my");
    expect(r.region!.id).toBe("yangon");
    inOrder(r.answer, MY_HEADINGS);
    expect(r.answer.endsWith(DISCLAIMER_MY)).toBe(true);
    expect(r.answer).not.toContain(DISCLAIMER_EN);
    expect(r.answer).toContain("ခန့်မှန်းချက် မဟုတ်ပါ");
    expect(r.topics).toContain("flood");
  });

  it("keeps the seven sections even when NASA is unavailable, and does not call the AI", async () => {
    const { f, calls } = mockFetch({ "https://power.larc.nasa.gov": () => new Response("down", { status: 503 }) });
    const r = await answerChat({ message: "drought in Bago" }, { config: keys(), fetchImpl: f, today: TODAY });
    inOrder(r.answer, EN_HEADINGS);
    expect(r.nasaDataAvailable).toBe(false);
    expect(r.answer).toMatch(/could not be retrieved/);
    expect(r.indicators.drought).toBe("unknown");
    expect(calls.some((c) => c.url.includes(".test"))).toBe(false);
  });
});

describe("indicators and decision support", () => {
  it("raises a drought warning when recent rain and soil wetness are far below past years", async () => {
    const { f } = mockFetch({ "https://power.larc.nasa.gov": nasa({ overrideFrom: "2026-08-01", override: { PRECTOTCORR: 0, GWETROOT: 0.2 } }) });
    const r = await answerChat({ message: "drought Magway" }, { config: baseConfig(), fetchImpl: f, today: TODAY });
    expect(r.indicators.drought).toBe("warning");
    expect(r.recommendations[0].id).toBe("drought_water");
    expect(r.recommendations[0].reason).toMatch(/percentile/);
    expect(r.recommendations[0].uncertainty).toMatch(/one NASA POWER grid point/);
    expect(r.actionCards.map((c) => c.id)).toContain("agriculture");
  });

  it("raises a wet watch after unusually heavy recent rain", async () => {
    const { f } = mockFetch({ "https://power.larc.nasa.gov": nasa({ overrideFrom: "2026-10-20", override: { PRECTOTCORR: 120, GWETROOT: 0.99 } }) });
    const r = await answerChat({ message: "flood risk Ayeyarwady" }, { config: baseConfig(), fetchImpl: f, today: TODAY });
    expect(r.indicators.wet).toBe("watch");
    expect(r.recommendations.some((x) => x.id === "wet_drainage")).toBe(true);
  });

  it("always ends decision support with the official DMH check", async () => {
    const { f } = mockFetch({ "https://power.larc.nasa.gov": nasa() });
    const r = await answerChat({ message: "crops in Mandalay" }, { config: baseConfig(), fetchImpl: f, today: TODAY });
    expect(r.recommendations.at(-1)?.id).toBe("official_forecast");
  });
});

describe("AI provider chain (direct answer only)", () => {
  it("uses OpenRouter first and places the verified AI text in Direct Answer only", async () => {
    let system = "";
    const { f } = mockFetch({
      "https://power.larc.nasa.gov": nasa(),
      "https://openrouter.test": (_u, init) => {
        system = JSON.parse(String(init!.body)).messages[0].content;
        const p50 = /\[hist_rain_p50\].*: (\d+) mm/.exec(system)![1];
        return completion(`• In past years these 30 days brought about ${p50} mm of rain, which matters for rice fields.`, "meta-llama/llama-3.3-70b-instruct:free");
      },
    });
    const r = await answerChat({ message: "rice farming Ayeyarwady next month" }, { config: keys(), fetchImpl: f, today: TODAY });
    expect(r.generator).toBe("llm");
    expect(r.provider).toBe("openrouter");
    expect(r.sections.summary).toContain("In past years these 30 days");
    expect(r.sections.outlook).not.toContain("In past years these 30 days");
    expect(r.sections.actions).not.toContain("In past years these 30 days");
    expect(system).toContain("VALIDATED 30-DAY FORECAST: NONE");
    expect(system).toContain("NOT a forecast");
  });

  it("keeps AI text in Direct Answer only, joining any bullets into one paragraph", async () => {
    const { f } = mockFetch({
      "https://power.larc.nasa.gov": nasa(),
      "https://openrouter.test": () => completion("Rice fields in Ayeyarwady look normal for the season.\n• Water supply matters for rice."),
    });
    const r = await answerChat({ message: "rice farming Ayeyarwady" }, { config: keys(), fetchImpl: f, today: TODAY });
    expect(r.summaryParts!.keyFindings.startsWith("Rice fields in Ayeyarwady look normal for the season. Water supply matters for rice.")).toBe(true);
    expect(r.sections.actions).not.toContain("Water supply matters for rice");
    expect(r.answer.endsWith(DISCLAIMER_EN)).toBe(true);
  });

  it("rejects AI text that turns history into a forecast or invents a probability", async () => {
    let n = 0;
    const { f } = mockFetch({
      "https://power.larc.nasa.gov": nasa(),
      "https://openrouter.test": () => completion(n++ === 0 ? "• There is a 70% chance of drought." : "• It will rain heavily next week."),
      "https://groq.test": () => completion("• Soils matter for rice."),
    });
    const r = await answerChat({ message: "drought Ayeyarwady" }, { config: keys(), fetchImpl: f, today: TODAY });
    expect(r.attempts.slice(0, 2).map((x) => x.outcome)).toEqual(["forbidden_claim", "forbidden_claim"]);
    expect(r.provider).toBe("groq");
    expect(r.answer).not.toContain("70%");
  });

  it("rejects invented numbers", async () => {
    const { f } = mockFetch({
      "https://power.larc.nasa.gov": nasa(),
      "https://openrouter.test": () => completion("• Rainfall was 777.7 mm."),
      "https://groq.test": () => new Response("x", { status: 429 }),
    });
    const r = await answerChat({ message: "rain Bago" }, { config: keys(), fetchImpl: f, today: TODAY });
    expect(r.attempts[0].outcome).toBe("unverified_numbers");
    expect(r.generator).toBe("template");
    expect(r.answer).not.toContain("777.7");
  });

  it("falls back OpenRouter (429) -> Groq, and stops OpenRouter on 402", async () => {
    const { f, calls } = mockFetch({
      "https://power.larc.nasa.gov": nasa(),
      "https://openrouter.test": () => new Response("payment required", { status: 402 }),
      "https://groq.test": () => completion("• Soil conditions matter for crops.", "openai/gpt-oss-20b"),
    });
    const r = await answerChat({ message: "crops Yangon" }, { config: keys(), fetchImpl: f, today: TODAY });
    expect(r.provider).toBe("groq");
    expect(calls.filter((c) => c.url.startsWith("https://openrouter.test"))).toHaveLength(1);
  });
});

describe("general (non-environmental) questions", () => {
  it("answers briefly without NASA data and ends with the general disclaimer", async () => {
    const { f, calls } = mockFetch({ "https://openrouter.test": () => completion("Mingalaba! I am happy to help.") });
    const r = await answerChat({ message: "hello, who are you?" }, { config: keys(), fetchImpl: f, today: TODAY });
    expect(r.kind).toBe("general");
    expect(r.nasaDataAvailable).toBe(false);
    expect(calls.some((c) => c.url.includes("power.larc"))).toBe(false);
    expect(r.answer.endsWith(answerFormat.generalDisclaimer.en)).toBe(true);
    expect(r.answer).not.toContain(DISCLAIMER_EN);
  });

  it("uses the template and Myanmar disclaimer when no AI is configured", async () => {
    const r = await answerChat({ message: "မင်္ဂလာပါ" }, { config: baseConfig(), today: TODAY });
    expect(r.generator).toBe("template");
    expect(r.answer.endsWith(answerFormat.generalDisclaimer.my)).toBe(true);
  });

  it("treats a question naming a region as environmental", async () => {
    const { f } = mockFetch({ "https://power.larc.nasa.gov": nasa() });
    const r = await answerChat({ message: "Tell me about Shan" }, { config: baseConfig(), fetchImpl: f, today: TODAY });
    expect(r.kind).toBe("environmental");
    expect(r.answer).toContain(DISCLAIMER_EN);
  });
});

describe("HTTP handler: validation and rate limiting", () => {
  beforeEach(() => resetRateLimiterForTests());
  const post = (body: unknown, headers: Record<string, string> = { "content-type": "application/json" }) =>
    new Request("http://localhost/api/earthlens-chat", { method: "POST", headers, body: typeof body === "string" ? body : JSON.stringify(body) });

  it("rejects bad requests", async () => {
    const cfg = baseConfig();
    expect((await handleChatPost(post({ message: "" }), { config: cfg })).status).toBe(400);
    expect((await handleChatPost(post({ message: "x".repeat(1001) }), { config: cfg })).status).toBe(400);
    expect((await handleChatPost(post({ message: "hi", selectedRegionId: "atlantis" }), { config: cfg })).status).toBe(400);
    expect((await handleChatPost(post({ message: "hi", apiKey: "x" }), { config: cfg })).status).toBe(400);
    expect((await handleChatPost(post("{not json"), { config: cfg })).status).toBe(400);
    expect((await handleChatPost(post({ message: "hi" }, { "content-type": "text/plain" }), { config: cfg })).status).toBe(415);
  });

  it("accepts the original EarthLens chat payload shape", async () => {
    const { f } = mockFetch({ "https://power.larc.nasa.gov": nasa() });
    const res = await handleChatPost(post({ message: "rain", sessionId: "s", selectedRegionId: "yangon", mode: "live", history: [] }), { config: baseConfig(), fetchImpl: f, today: TODAY });
    expect(res.status).toBe(200);
    const j = await res.json();
    expect(j).toMatchObject({ region: { id: "yangon" }, generator: "template", mode: "live" });
  });

  it("rate-limits after the configured number of requests", async () => {
    const cfg = baseConfig({ rateLimit: { max: 2, windowMs: 60_000 } });
    const { f } = mockFetch({ "https://power.larc.nasa.gov": nasa() });
    const s = [];
    for (let i = 0; i < 3; i++) s.push((await handleChatPost(post({ message: "rain" }), { config: cfg, fetchImpl: f, today: TODAY })).status);
    expect(s).toEqual([200, 200, 429]);
  });

  it("rejects foreign origins when an allowlist is set", async () => {
    const cfg = baseConfig({ allowedOrigins: ["https://earthlens.example"] });
    const res = await handleChatPost(post({ message: "rain" }, { "content-type": "application/json", origin: "https://evil.example" }), { config: cfg });
    expect(res.status).toBe(403);
  });
});
