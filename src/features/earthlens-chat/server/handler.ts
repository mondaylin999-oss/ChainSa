import "server-only";
import type { ChatErrorBody, ChatResponseBody, Lang, ParamKey } from "../types";
import { detectRegion, getRegion } from "../regions";
import { audienceOf, detectLimitations, detectParams, detectTopics, isEnvironmentalQuestion } from "../params";
import { detectLang } from "../i18n";
import { answerFormat as defaultFormat, type AnswerFormat } from "../config/answer-format";
import { getConfig, type ServerConfig } from "./env";
import { RateLimiter, clientKey } from "./rate-limit";
import { chatRequestSchema, formatZodError, sanitizeText, MAX_BODY_BYTES, type ValidChatRequest } from "./validation";
import { buildGrounding } from "./grounding";
import { buildAssessment } from "./climate/assessment";
import { buildRecommendations } from "./recommendations";
import { getValidatedOutlook } from "./forecast/validated-outlook";
import { buildAnswer } from "./answer-builder";
import { buildVegetation } from "./vegetation";
import { buildActionCards, buildDataTable, detectDecisions } from "./presentation";
import { buildGeneralPrompt, buildMessages, buildSystemPrompt } from "./prompt";
import { runProviderChain } from "./providers/chain";
import { buildAllowed, contradictsData, forbiddenClaims, verifyAnswer, type VerifyResult } from "./verify";

export interface HandlerDeps {
  config?: ServerConfig;
  fetchImpl?: typeof fetch;
  format?: AnswerFormat;
  today?: string;
}

const AUDIENCE = { farmers: "farmers", coastal: "coastal and fishing communities", general: "farmers and the general public" } as const;
/** Current Conditions always covers these five NASA POWER variables. */
const CORE_PARAMS: ParamKey[] = ["rainfall", "temperature", "humidity", "wind", "soilWetness"];

/** Core chat logic, independent of Next.js so it can be unit-tested and reused. */
export async function answerChat(req: ValidChatRequest, deps: HandlerDeps = {}): Promise<ChatResponseBody> {
  const cfg = deps.config ?? getConfig();
  const fmt = deps.format ?? defaultFormat;
  const message = sanitizeText(req.message);
  const lang: Lang = detectLang(message, req.lang ?? "en");
  const named = detectRegion(message);
  if (!isEnvironmentalQuestion(message, Boolean(named))) return answerGeneral(message, lang, req, cfg, fmt, deps);
  const selected = getRegion(req.selectedRegionId);
  // Never guess a location: without one named in the question or selected on the map, ask for it.
  if (!named && !selected) return answerNeedsRegion(lang, fmt);
  const region = (named ?? selected)!;
  const regionSource: "question" | "map" = named ? "question" : "map";
  const mapRegionName = named && selected && selected.id !== named.id ? (lang === "my" ? selected.nameMy : selected.name) : null;
  const detected = detectParams(message);
  const params: ParamKey[] = [...CORE_PARAMS, ...(detected.includes("fires") ? (["fires"] as ParamKey[]) : [])];
  const topics = detectTopics(message);
  // MODIS NDVI only for vegetation, crop, farming and drought questions (not every default topic).
  const wantsVegetation = detected.includes("vegetation");
  const limitations = detectLimitations(message, region.id, lang);

  const [g0, a0, veg] = await Promise.all([
    buildGrounding(region, params, lang, { fetchImpl: deps.fetchImpl, firmsMapKey: cfg.firmsMapKey, nasaTimeoutMs: cfg.nasaTimeoutMs, powerBaseUrl: cfg.powerBaseUrl, today: deps.today }),
    buildAssessment(region, { fetchImpl: deps.fetchImpl, timeoutMs: Math.min(60_000, cfg.nasaTimeoutMs * 3), powerBaseUrl: cfg.powerBaseUrl, today: deps.today }),
    wantsVegetation ? buildVegetation(region, lang, { fetchImpl: deps.fetchImpl, timeoutMs: cfg.nasaTimeoutMs, modisBaseUrl: cfg.modisBaseUrl }) : null,
  ]);
  // NDVI observations join the current data, its past-year comparison joins the historical section.
  const g = veg
    ? { ...g0, facts: [...g0.facts, ...veg.facts.filter((f) => f.kind === "observation")], sources: [...g0.sources, ...veg.sources], notes: [...g0.notes, ...veg.notes], nasaDataAvailable: g0.nasaDataAvailable || veg.facts.length > 0 }
    : g0;
  const a = veg ? { ...a0, facts: [...a0.facts, ...veg.facts.filter((f) => f.kind === "comparison")] } : a0;
  const outlook = await getValidatedOutlook(region, a.outlookWindow);
  const recs = buildRecommendations(a, lang);
  const nasaDataAvailable = g.nasaDataAvailable || a.available;

  // Structured presentation, built only from NASA facts (never by the AI).
  // detectTopics returns all three topics when the question names none; cards should follow the question.
  const explicitTopics = topics.length === 3 && topics[0] === "agriculture" ? [] : topics;
  const decisions = detectDecisions(message, explicitTopics);
  const allFactsForUi = [...g.facts, ...a.facts];
  const dataTable = buildDataTable(allFactsForUi, a, { topics: explicitTopics, decisions, asked: detected, lang });
  const { cards: actionCards, note: actionNote } = nasaDataAvailable
    ? buildActionCards({
        facts: allFactsForUi, a, topics: explicitTopics, decisions, lang, today: deps.today ?? new Date().toISOString().slice(0, 10),
        // a question about one specific parameter (wind, humidity, fires…) gets no alert cards about other parameters
        focused: detected.some((p) => p === "wind" || p === "humidity" || p === "fires" || p === "vegetation"),
      })
    : { cards: [], note: lang === "my" ? "ယုံကြည်စိတ်ချရသော လုပ်ဆောင်ချက် အကြံပြုချက် ပေးရန် အထောက်အထား မလုံလောက်ပါ။" : "Insufficient evidence to generate a reliable action recommendation." };

  let aiDirect: string | null = null;
  let provider: ChatResponseBody["provider"] = null;
  let model: string | null = null;
  let attempts: ChatResponseBody["attempts"] = [];
  let verification: VerifyResult | null = null;

  // The AI is only asked when there is real NASA data to ground it in, only for enabled answer languages
  // (AI_LANGUAGES), and only writes the direct answer.
  const aiAllowed = cfg.aiLanguages.includes(lang);
  if (nasaDataAvailable && !aiAllowed) attempts = [{ provider: "openrouter", model: "-", outcome: "language_disabled" }];
  if (nasaDataAvailable && aiAllowed) {
    const allFacts = [...g.facts, ...a.facts];
    const allowed = buildAllowed(allFacts, region);
    const system = buildSystemPrompt({
      region, lang, topics, audience: AUDIENCE[audienceOf(message)],
      observations: [...g.facts, ...a.facts.filter((f) => f.kind === "observation")],
      comparisons: a.facts.filter((f) => f.kind === "comparison"),
      historical: a.facts.filter((f) => f.kind === "historical"),
      assessment: a, recommendations: recs, limitations, notes: g.notes, format: fmt,
    });
    const chain = await runProviderChain(
      buildMessages(system, req.history, message),
      cfg,
      (text) => {
        const bad = forbiddenClaims(text);
        if (bad.length) {
          console.warn(`[earthlens-chat] AI answer rejected (forecast/probability wording): ${bad.join(" | ")}`);
          return "forbidden_claim";
        }
        const contradiction = contradictsData(text, allFacts);
        if (contradiction) {
          console.warn(`[earthlens-chat] AI answer rejected (contradicts NASA comparison): ${contradiction}`);
          return "contradicts_data";
        }
        const v = verifyAnswer(text, allowed);
        if (!v.ok) console.warn(`[earthlens-chat] AI answer had numbers not in NASA data: ${v.unverified.join(", ")}`);
        if (v.ok || cfg.verifyMode === "warn") {
          verification = v;
          return true;
        }
        return "unverified_numbers";
      },
      deps.fetchImpl,
    );
    attempts = chain.attempts;
    if (chain.text) {
      // The AI is asked for 1–3 plain sentences; if it still writes bullets, they are joined into one paragraph.
      const sp = splitAiText(chain.text);
      const bullets = sp.impacts?.split("\n").map((l) => l.replace(/^•\s*/, "")).join(" ") ?? null;
      aiDirect = sp.direct ? (bullets ? `${sp.direct} ${bullets}` : sp.direct) : bullets;
      provider = chain.provider;
      model = chain.model;
    }
  }

  const built = buildAnswer({ lang, fmt, g, a, outlook, aiDirect, topics, limitations, table: dataTable, cards: actionCards, cardNote: actionNote, regionSource, mapRegionName });
  const v = verification as VerifyResult | null;

  return {
    answer: built.text,
    lang,
    region: { id: region.id, name: region.name, nameMy: region.nameMy },
    period: g.period,
    sources: [...g.sources, ...(a.available && !g.sources.length ? [{ name: "NASA POWER (daily, AG community)", url: "https://power.larc.nasa.gov/docs/services/api/temporal/daily/" }] : [])].map((s) => ({ name: s.name, url: s.url })),
    facts: [...g.facts, ...a.facts],
    dataFooter: built.sections.sources,
    limitations: [...limitations, ...g.notes],
    generator: aiDirect ? "llm" : "template",
    provider,
    model,
    attempts,
    verification: v ? { numbersChecked: v.checked, numbersVerified: v.verified } : null,
    nasaDataAvailable,
    mode: "live",
    kind: "environmental",
    topics,
    indicators: { drought: a.drought, wet: a.wet, heat: a.heat },
    outlook: { window: a.outlookWindow, forecastAvailable: !!outlook?.probabilities.length, historical: a.facts.filter((f) => f.kind === "historical") },
    recommendations: recs,
    sections: built.sections,
    summary: built.sections.summary,
    summaryParts: built.summaryParts,
    dataTable,
    actionCards,
    actionNote: actionCards.length ? null : actionNote,
  };
}

/** Splits the AI text into the leading direct-answer sentence(s) and the bullet points. */
export function splitAiText(text: string): { direct: string | null; impacts: string | null } {
  const lines = text.trim().split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const i = lines.findIndex((l) => /^[•\-*]\s/.test(l));
  const lead = (i === -1 ? lines.slice(0, 1) : lines.slice(0, i)).join(" ");
  const rest = (i === -1 ? lines.slice(1) : lines.slice(i)).map((l) => l.replace(/^[-*]\s/, "• ")).join("\n");
  return { direct: lead || null, impacts: rest || null };
}

const GENERAL_TEMPLATE = {
  en: "I'm the EarthLens Assistant. I can't give a reliable answer to that question right now. I can answer questions about rainfall, temperature, drought, floods, crops, soil moisture or fires in any Myanmar state or region, using NASA data.",
  my: "ကျွန်ုပ်သည် EarthLens လက်ထောက် ဖြစ်ပါသည်။ ထိုမေးခွန်းကို ယခု ယုံကြည်စိတ်ချစွာ မဖြေနိုင်ပါ။ မြန်မာနိုင်ငံ မည်သည့် ပြည်နယ်/တိုင်းဒေသကြီး၏ မိုးရေချိန်၊ အပူချိန်၊ မိုးခေါင်မှု၊ ရေကြီးမှု၊ သီးနှံ၊ မြေစိုထိုင်းဆ သို့မဟုတ် မီးလောင်မှုအကြောင်းကို NASA အချက်အလက်ဖြင့် ဖြေနိုင်ပါသည်။",
};

/** Non-environmental questions: short answer, no NASA analysis, general disclaimer added by the server. */
async function answerGeneral(message: string, lang: Lang, req: ValidChatRequest, cfg: ServerConfig, fmt: AnswerFormat, deps: HandlerDeps): Promise<ChatResponseBody> {
  const chain = cfg.aiLanguages.includes(lang)
    ? await runProviderChain(
        buildMessages(buildGeneralPrompt(lang), req.history, message),
        cfg,
        (text) => (forbiddenClaims(text).length ? "forbidden_claim" : true),
        deps.fetchImpl,
      )
    : { text: null, provider: null, model: null, attempts: [{ provider: "openrouter" as const, model: "-", outcome: "language_disabled" as const }] };
  const body = chain.text?.trim() || GENERAL_TEMPLATE[lang];
  const disclaimer = fmt.generalDisclaimer[lang];
  const region = getRegion(req.selectedRegionId) ?? null;
  const empty = { summary: body, current: "", history: "", outlook: "", actions: "", sources: "", disclaimer };
  return {
    answer: `${body}\n\n${disclaimer}`,
    lang,
    region: region ? { id: region.id, name: region.name, nameMy: region.nameMy } : null,
    period: null,
    sources: [],
    facts: [],
    dataFooter: "",
    limitations: [],
    generator: chain.text ? "llm" : "template",
    provider: chain.text ? chain.provider : null,
    model: chain.text ? chain.model : null,
    attempts: chain.attempts,
    verification: null,
    nasaDataAvailable: false,
    mode: "live",
    kind: "general",
    topics: [],
    indicators: { drought: "unknown", wet: "unknown", heat: "unknown" },
    outlook: { window: { start: "", end: "" }, forecastAvailable: false, historical: [] },
    recommendations: [],
    sections: empty,
    summary: body,
    summaryParts: null,
    dataTable: null,
    actionCards: [],
    actionNote: null,
  };
}

/** Environmental question without any location: no NASA data is fetched and no region is guessed. */
function answerNeedsRegion(lang: Lang, fmt: AnswerFormat): ChatResponseBody {
  const T = <V,>(t: { en: V; my: V }) => t[lang];
  const parts = {
    region: T({ en: "Location not selected yet", my: "တည်နေရာ မရွေးချယ်ရသေးပါ" }),
    keyFindings: T({ en: "No NASA data was retrieved, because no state or region has been chosen.", my: "ပြည်နယ် သို့မဟုတ် တိုင်းဒေသကြီး မရွေးချယ်ရသေးသဖြင့် NASA အချက်အလက် မရယူရသေးပါ။" }),
    recommendation: T({ en: "Select a state or region on the map, or name one in your question (for example: “drought risk in Magway”).", my: "မြေပုံပေါ်တွင် ပြည်နယ်/တိုင်းဒေသကြီး တစ်ခု ရွေးပါ၊ သို့မဟုတ် မေးခွန်းတွင် ထည့်ရေးပါ (ဥပမာ - “မကွေးတိုင်းဒေသကြီး မိုးခေါင်နိုင်ခြေ”)။" }),
    regionSelected: false,
  };
  const disclaimer = fmt.generalDisclaimer[lang];
  const lab = lang === "my" ? ["တိုင်းဒေသကြီး / ပြည်နယ်", "အဓိကတွေ့ရှိချက်", "အဓိကအကြံပြုချက်"] : ["Region", "Key findings", "Key recommendation"];
  const body = `${lab[0]}: ${parts.region}\n\n${lab[1]}: ${parts.keyFindings}\n\n${lab[2]}: ${parts.recommendation}`;
  return {
    answer: `${body}\n\n${disclaimer}`,
    lang,
    region: null,
    period: null,
    sources: [],
    facts: [],
    dataFooter: "",
    limitations: [],
    generator: "template",
    provider: null,
    model: null,
    attempts: [],
    verification: null,
    nasaDataAvailable: false,
    mode: "live",
    kind: "needs_region",
    topics: [],
    indicators: { drought: "unknown", wet: "unknown", heat: "unknown" },
    outlook: { window: { start: "", end: "" }, forecastAvailable: false, historical: [] },
    recommendations: [],
    sections: { summary: body, current: "", history: "", outlook: "", actions: "", sources: "", disclaimer },
    summary: body,
    summaryParts: parts,
    dataTable: null,
    actionCards: [],
    actionNote: null,
  };
}

let limiter: RateLimiter | null = null;

const json = (data: ChatResponseBody | ChatErrorBody, status = 200, extra: Record<string, string> = {}) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", "x-content-type-options": "nosniff", ...extra },
  });

/** Next.js Route Handler entry point (POST). */
export async function handleChatPost(request: Request, deps: HandlerDeps = {}): Promise<Response> {
  const cfg = deps.config ?? getConfig();

  if (!(request.headers.get("content-type") ?? "").includes("application/json"))
    return json({ error: "Content-Type must be application/json.", code: "invalid_request" }, 415);

  if (cfg.allowedOrigins.length) {
    const origin = request.headers.get("origin");
    if (origin && !cfg.allowedOrigins.includes(origin)) return json({ error: "Origin not allowed.", code: "forbidden_origin" }, 403);
  }

  limiter ??= new RateLimiter(cfg.rateLimit.max, cfg.rateLimit.windowMs);
  const rl = limiter.check(clientKey(request.headers, cfg.trustProxy));
  if (!rl.allowed)
    return json({ error: "Too many requests. Please wait and try again.", code: "rate_limited" }, 429, { "retry-after": String(rl.retryAfterSeconds) });

  const raw = await request.text();
  if (new TextEncoder().encode(raw).length > MAX_BODY_BYTES) return json({ error: "Request body too large.", code: "invalid_request" }, 413);

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(raw);
  } catch {
    return json({ error: "Body is not valid JSON.", code: "invalid_request" }, 400);
  }
  const parsed = chatRequestSchema.safeParse(parsedJson);
  if (!parsed.success) return json({ error: formatZodError(parsed.error), code: "invalid_request" }, 400);

  try {
    return json(await answerChat(parsed.data, { ...deps, config: cfg }));
  } catch (err) {
    console.error("[earthlens-chat] unexpected error", err);
    return json({ error: "Something went wrong while preparing the answer.", code: "server_error" }, 500);
  }
}

/** For tests only. */
export function resetRateLimiterForTests() {
  limiter = null;
}

/** Public status: which providers are configured. Never returns keys. */
export function chatStatus(cfg: ServerConfig = getConfig()) {
  return {
    openrouter: { configured: !!cfg.openrouter.apiKey, models: cfg.openrouter.models, ignoredNonFreeModels: cfg.openrouter.rejectedModels },
    groq: { configured: !!cfg.groq.apiKey, models: cfg.groq.models, ignoredNonAllowlistedModels: cfg.groq.rejectedModels },
    firms: { configured: !!cfg.firmsMapKey },
    nasaPower: { configured: true, note: "NASA POWER needs no key." },
    verifyMode: cfg.verifyMode,
    rateLimit: { max: cfg.rateLimit.max, windowSeconds: cfg.rateLimit.windowMs / 1000 },
  };
}
