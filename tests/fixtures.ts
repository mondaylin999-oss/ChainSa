import type { ServerConfig } from "@/features/earthlens-chat/server/env";

/** Builds a NASA POWER-shaped daily response. Values are synthetic test data, not observations. */
export function powerJson(start: string, days: number, opts: { missingLast?: number } = {}) {
  const codes = ["PRECTOTCORR", "T2M", "T2M_MAX", "T2M_MIN", "RH2M", "WS10M", "WS10M_MAX", "GWETROOT"];
  const param: Record<string, Record<string, number>> = {};
  for (const c of codes) param[c] = {};
  const d0 = new Date(`${start}T00:00:00Z`);
  for (let i = 0; i < days; i++) {
    const d = new Date(d0);
    d.setUTCDate(d.getUTCDate() + i);
    const k = d.toISOString().slice(0, 10).replaceAll("-", "");
    const missing = opts.missingLast && i >= days - opts.missingLast;
    param.PRECTOTCORR[k] = missing ? -999 : [0, 2.5, 10.25, 0.4, 5, 1, 0][i % 7];
    param.T2M[k] = missing ? -999 : 27 + (i % 3) * 0.5;
    param.T2M_MAX[k] = missing ? -999 : 31 + (i % 4);
    param.T2M_MIN[k] = missing ? -999 : 22 - (i % 2);
    param.RH2M[k] = missing ? -999 : 80 + (i % 5);
    param.WS10M[k] = missing ? -999 : 2 + (i % 3) * 0.5;
    param.WS10M_MAX[k] = missing ? -999 : 5 + (i % 4);
    param.GWETROOT[k] = missing ? -999 : 0.7 + (i % 2) * 0.05;
  }
  return {
    header: { fill_value: -999 },
    parameters: {
      PRECTOTCORR: { units: "mm/day" }, T2M: { units: "C" }, T2M_MAX: { units: "C" }, T2M_MIN: { units: "C" },
      RH2M: { units: "%" }, WS10M: { units: "m/s" }, WS10M_MAX: { units: "m/s" }, GWETROOT: { units: "1" },
    },
    properties: { parameter: param },
  };
}

export const baseConfig = (over: Partial<ServerConfig> = {}): ServerConfig => ({
  openrouter: { name: "openrouter", apiKey: "", baseUrl: "https://openrouter.test/api/v1", models: ["openrouter/free", "meta-llama/llama-3.3-70b-instruct:free"], rejectedModels: [] },
  groq: { name: "groq", apiKey: "", baseUrl: "https://groq.test/openai/v1", models: ["openai/gpt-oss-20b"], rejectedModels: [] },
  firmsMapKey: "",
  aiLanguages: ["en", "my"],
  aiTimeoutMs: 5000,
  verifyMode: "strict",
  nasaTimeoutMs: 5000,
  powerBaseUrl: "https://power.larc.nasa.gov/api/temporal",
  modisBaseUrl: "https://modis.ornl.gov/rst/api/v1",
  rateLimit: { max: 10, windowMs: 60_000 },
  trustProxy: false,
  allowedOrigins: [],
  openrouterReferer: "",
  openrouterTitle: "test",
  ...over,
});

type Handler = (url: string, init?: RequestInit) => Response | Promise<Response>;

/** fetch mock that routes by URL prefix and records every call. */
export function mockFetch(routes: Record<string, Handler>) {
  const calls: { url: string; body?: unknown }[] = [];
  const f = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    calls.push({ url, body: init?.body ? JSON.parse(String(init.body)) : undefined });
    for (const [prefix, h] of Object.entries(routes)) if (url.startsWith(prefix)) return h(url, init);
    throw new Error(`unmocked fetch ${url}`);
  }) as typeof fetch;
  return { f, calls };
}

export const completion = (content: string, model = "test-model:free") =>
  new Response(JSON.stringify({ model, choices: [{ message: { content } }] }), { status: 200, headers: { "content-type": "application/json" } });

/** Deterministic pseudo-random number in [0,1) from a string. */
function hash01(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return ((h >>> 0) % 100000) / 100000;
}

export interface SyntheticOpts {
  /** Days at the end of the requested range returned as -999 (not yet published). */
  missingLast?: number;
  /** Override values for dates >= this date (to create drought / wet situations). */
  overrideFrom?: string;
  override?: Partial<Record<string, number>>;
}

/**
 * NASA POWER-shaped response for whatever range/codes the URL asks for, with a monsoon-like
 * seasonal cycle. Synthetic test data — NOT NASA observations.
 */
export function powerFromUrl(url: string, opts: SyntheticOpts = {}) {
  const q = new URL(url).searchParams;
  const codes = (q.get("parameters") ?? "").split(",");
  const iso = (s: string) => `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`;
  const start = iso(q.get("start")!), end = iso(q.get("end")!);
  const param: Record<string, Record<string, number>> = Object.fromEntries(codes.map((c) => [c, {}]));
  const last = new Date(`${end}T00:00:00Z`);
  last.setUTCDate(last.getUTCDate() - (opts.missingLast ?? 2));
  const cutoff = last.toISOString().slice(0, 10);
  for (let d = new Date(`${start}T00:00:00Z`); d.toISOString().slice(0, 10) <= end; d.setUTCDate(d.getUTCDate() + 1)) {
    const ds = d.toISOString().slice(0, 10);
    const k = ds.replaceAll("-", "");
    const month = d.getUTCMonth() + 1;
    const monsoon = month >= 5 && month <= 10;
    const r = hash01(ds);
    const vals: Record<string, number> = {
      PRECTOTCORR: monsoon ? (r < 0.3 ? 0 : r * 30) : r < 0.85 ? 0 : r * 8,
      T2M: monsoon ? 27 + r * 2 : 24 + r * 3,
      T2M_MAX: monsoon ? 31 + r * 3 : 30 + r * 4,
      T2M_MIN: monsoon ? 23 + r : 18 + r * 2,
      RH2M: monsoon ? 85 + r * 8 : 65 + r * 10,
      WS10M: 2 + r * 2,
      WS10M_MAX: 4 + r * 4,
      GWETROOT: monsoon ? 0.75 + r * 0.15 : 0.55 + r * 0.15,
    };
    if (opts.overrideFrom && ds >= opts.overrideFrom) Object.assign(vals, opts.override);
    for (const c of codes) param[c][k] = ds > cutoff ? -999 : Math.round((vals[c] ?? 0) * 100) / 100;
  }
  return {
    header: { fill_value: -999 },
    parameters: { PRECTOTCORR: { units: "mm/day" }, T2M: { units: "C" }, T2M_MAX: { units: "C" }, T2M_MIN: { units: "C" }, RH2M: { units: "%" }, WS10M: { units: "m/s" }, WS10M_MAX: { units: "m/s" }, GWETROOT: { units: "1" } },
    properties: { parameter: param },
  };
}
