import "server-only";
import { REGIONS } from "@/features/earthlens-chat/regions";
import { getConfig } from "@/features/earthlens-chat/server/env";
import { NasaError } from "@/features/earthlens-chat/server/nasa/power";
import { RateLimiter, clientKey } from "@/features/earthlens-chat/server/rate-limit";
import admin1 from "@/features/earthlens-chat/server/nasa/myanmar-admin1.json";
import { analyze, analyzeSchema, validateRange } from "./analyze";
import type { SiteStatus } from "../types";

const MAX_BODY_BYTES = 8 * 1024;
const json = (body: unknown, status = 200, extra: Record<string, string> = {}) =>
  Response.json(body, { status, headers: { "cache-control": "no-store", ...extra } });

export function regionsResponse() {
  return Response.json({ regions: REGIONS, boundaries: admin1 }, { headers: { "cache-control": "public, max-age=86400" } });
}

export function siteStatus(): SiteStatus {
  const cfg = getConfig();
  const or = Boolean(cfg.openrouter.apiKey && cfg.openrouter.models.length);
  const gq = Boolean(cfg.groq.apiKey && cfg.groq.models.length);
  return { power: true, firms: Boolean(cfg.firmsMapKey), llm: or || gq, llmProvider: or ? "openrouter" : gq ? "groq" : null };
}

let limiter: RateLimiter | null = null;

export async function handleAnalyzePost(request: Request): Promise<Response> {
  const cfg = getConfig();
  limiter ??= new RateLimiter(cfg.rateLimit.max * 2, cfg.rateLimit.windowMs);
  const rl = limiter.check(`analyze:${clientKey(request.headers, cfg.trustProxy)}`);
  if (!rl.allowed) return json({ error: "Too many requests. Please wait a moment." }, 429, { "retry-after": String(rl.retryAfterSeconds) });

  const raw = await request.text();
  if (raw.length > MAX_BODY_BYTES) return json({ error: "Request too large." }, 413);
  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return json({ error: "Invalid JSON." }, 400);
  }
  const parsed = analyzeSchema.safeParse(body);
  if (!parsed.success) return json({ error: parsed.error.issues.map((i) => i.message).join("; ") }, 400);
  const rangeError = validateRange(parsed.data.range);
  if (rangeError) return json({ error: rangeError }, 400);

  try {
    return json(await analyze(parsed.data));
  } catch (err) {
    if (err instanceof NasaError) return json({ error: err.message }, 502);
    console.error("[earthlens-site] analyze failed:", (err as Error)?.message);
    return json({ error: "Something went wrong while analysing NASA data." }, 500);
  }
}
