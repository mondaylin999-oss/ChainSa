import "server-only";
import type { ChatErrorBody, ChatResponseBody, Lang, ParamKey } from "../types";
import { DEFAULT_REGION_ID, detectRegion, getRegion } from "../regions";
import { audienceOf, detectLimitations, detectParams, detectTopics } from "../params";
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
import { buildMessages, buildSystemPrompt } from "./prompt";
import { runProviderChain } from "./providers/chain";
import { buildAllowed, forbiddenClaims, verifyAnswer, type VerifyResult } from "./verify";

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
  const region = detectRegion(message) ?? getRegion(req.selectedRegionId) ?? getRegion(DEFAULT_REGION_ID)!;
  const params: ParamKey[] = [...CORE_PARAMS, ...(detectParams(message).includes("fires") ? (["fires"] as ParamKey[]) : [])];
  const topics = detectTopics(message);
  const limitations = detectLimitations(message, region.id, lang);

  const [g, a] = await Promise.all([
    buildGrounding(region, params, lang, { fetchImpl: deps.fetchImpl, firmsMapKey: cfg.firmsMapKey, nasaTimeoutMs: cfg.nasaTimeoutMs, powerBaseUrl: cfg.powerBaseUrl, today: deps.today }),
    buildAssessment(region, { fetchImpl: deps.fetchImpl, timeoutMs: Math.min(60_000, cfg.nasaTimeoutMs * 3), powerBaseUrl: cfg.powerBaseUrl, today: deps.today }),
  ]);
  const outlook = await getValidatedOutlook(region, a.outlookWindow);
  const recs = buildRecommendations(a, lang);
  const nasaDataAvailable = g.nasaDataAvailable || a.available;

  let aiImpacts: string | null = null;
  let provider: ChatResponseBody["provider"] = null;
  let model: string | null = null;
  let attempts: ChatResponseBody["attempts"] = [];
  let verification: VerifyResult | null = null;

  // The AI is only asked when there is real NASA data to ground it in, and only writes section 3.
  if (nasaDataAvailable) {
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
      aiImpacts = chain.text;
      provider = chain.provider;
      model = chain.model;
    }
  }

  const built = buildAnswer({ lang, fmt, g, a, recs, outlook, aiImpacts, limitations });
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
    generator: aiImpacts ? "llm" : "template",
    provider,
    model,
    attempts,
    verification: v ? { numbersChecked: v.checked, numbersVerified: v.verified } : null,
    nasaDataAvailable,
    mode: "live",
    topics,
    indicators: { drought: a.drought, wet: a.wet, heat: a.heat },
    outlook: { window: a.outlookWindow, forecastAvailable: !!outlook?.probabilities.length, historical: a.facts.filter((f) => f.kind === "historical") },
    recommendations: recs,
    sections: built.sections,
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
