import "server-only";

/**
 * Server-side configuration. Only this module reads process.env, and it is marked "server-only",
 * so importing it from a client component fails the build instead of leaking keys.
 */

export interface ProviderConfig {
  name: "openrouter" | "groq";
  apiKey: string;
  baseUrl: string;
  models: string[];
  /** Models that were listed in the env but refused because they are not free. */
  rejectedModels: string[];
}

export interface ServerConfig {
  openrouter: ProviderConfig;
  groq: ProviderConfig;
  firmsMapKey: string;
  aiTimeoutMs: number;
  /** strict = reject AI answers with numbers not found in NASA facts (default); warn = keep them but log. */
  verifyMode: "strict" | "warn";
  nasaTimeoutMs: number;
  /** NASA POWER API base; only overridden for local testing. */
  powerBaseUrl: string;
  rateLimit: { max: number; windowMs: number };
  trustProxy: boolean;
  allowedOrigins: string[];
  openrouterReferer: string;
  openrouterTitle: string;
}

const list = (v: string | undefined, fallback: string[]) =>
  v && v.trim() ? v.split(",").map((s) => s.trim()).filter(Boolean) : fallback;

const int = (v: string | undefined, fallback: number, min: number, max: number) => {
  const n = Number.parseInt(v ?? "", 10);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
};

/** OpenRouter: only the free router or `:free` model variants are ever allowed. */
export function isFreeOpenRouterModel(id: string): boolean {
  return id === "openrouter/free" || id.endsWith(":free");
}

/**
 * Groq has no per-model "free" marker in its API — free use depends on the account plan.
 * We therefore only allow models on this list (models on Groq's Free/Developer rate-limit table
 * as of Nov 2026). Keep your Groq account on the Free plan with no billing.
 */
export const GROQ_FREE_ALLOWLIST = new Set([
  "openai/gpt-oss-20b",
  "openai/gpt-oss-120b",
  "qwen/qwen3.8-27b",
]);

function baseUrl(v: string | undefined, fallback: string): string {
  const url = (v && v.trim()) || fallback;
  const u = new URL(url);
  const local = u.hostname === "localhost" || u.hostname === "127.0.0.1";
  if (u.protocol !== "https:" && !local) throw new Error(`Refusing non-HTTPS provider URL: ${url}`);
  return url.replace(/\/$/, "");
}

let cached: ServerConfig | null = null;

export function getConfig(): ServerConfig {
  if (cached) return cached;
  const e = process.env;

  const orModels = list(e.OPENROUTER_MODELS, ["openrouter/free"]);
  const groqModels = list(e.GROQ_MODELS, ["openai/gpt-oss-20b", "openai/gpt-oss-120b"]);
  const extraGroq = list(e.GROQ_EXTRA_FREE_MODELS, []);
  const groqAllowed = new Set([...GROQ_FREE_ALLOWLIST, ...extraGroq]);

  cached = {
    openrouter: {
      name: "openrouter",
      apiKey: (e.OPENROUTER_API_KEY ?? "").trim(),
      baseUrl: baseUrl(e.OPENROUTER_BASE_URL, "https://openrouter.ai/api/v1"),
      models: orModels.filter(isFreeOpenRouterModel),
      rejectedModels: orModels.filter((m) => !isFreeOpenRouterModel(m)),
    },
    groq: {
      name: "groq",
      apiKey: (e.GROQ_API_KEY ?? "").trim(),
      baseUrl: baseUrl(e.GROQ_BASE_URL, "https://api.groq.com/openai/v1"),
      models: groqModels.filter((m) => groqAllowed.has(m)),
      rejectedModels: groqModels.filter((m) => !groqAllowed.has(m)),
    },
    firmsMapKey: (e.FIRMS_MAP_KEY ?? "").trim(),
    aiTimeoutMs: int(e.AI_TIMEOUT_MS, 25_000, 3_000, 60_000),
    verifyMode: (e.CHAT_VERIFY_MODE ?? "").toLowerCase() === "warn" ? "warn" : "strict",
    nasaTimeoutMs: int(e.NASA_TIMEOUT_MS, 20_000, 3_000, 60_000),
    powerBaseUrl: baseUrl(e.NASA_POWER_BASE_URL, "https://power.larc.nasa.gov/api/temporal"),
    rateLimit: {
      max: int(e.CHAT_RATE_LIMIT_MAX, 10, 1, 1000),
      windowMs: int(e.CHAT_RATE_LIMIT_WINDOW_SECONDS, 60, 1, 86_400) * 1000,
    },
    trustProxy: (e.TRUST_PROXY ?? "").toLowerCase() === "true",
    allowedOrigins: list(e.CHAT_ALLOWED_ORIGINS, []),
    openrouterReferer: (e.OPENROUTER_SITE_URL ?? "").trim(),
    openrouterTitle: (e.OPENROUTER_APP_NAME ?? "Myanmar EarthLens").trim(),
  };

  for (const p of [cached.openrouter, cached.groq]) {
    if (p.rejectedModels.length)
      console.warn(`[earthlens-chat] Ignoring non-free ${p.name} models: ${p.rejectedModels.join(", ")}`);
  }
  return cached;
}

/** For tests only. */
export function resetConfigForTests() {
  cached = null;
}
