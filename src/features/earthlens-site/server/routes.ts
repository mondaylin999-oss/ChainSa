import "server-only";
import { REGIONS } from "@/features/earthlens-chat/regions";
import { getConfig } from "@/features/earthlens-chat/server/env";
import { NasaError } from "@/features/earthlens-chat/server/nasa/power";
import { RateLimiter, clientKey } from "@/features/earthlens-chat/server/rate-limit";
import admin1 from "@/features/earthlens-chat/server/nasa/myanmar-admin1.json";
import { fetchNdviSummary, NDVI_SOURCE } from "@/features/earthlens-chat/server/nasa/modis-ndvi";
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

const MYANMAR_BOX = { south: 9.5, north: 28.6, west: 92.0, east: 101.2 };

/**
 * GET /api/modis/ndvi?regionId=mandalay   or   ?lat=21.4&lon=95.95
 * NASA MODIS MOD13Q1 NDVI near the point: latest 16-day composite, the one before, and the same
 * composite in the last 10 years. Observations only — not a crop-yield estimate or a forecast.
 */
export async function handleNdviGet(request: Request): Promise<Response> {
  const cfg = getConfig();
  limiter ??= new RateLimiter(cfg.rateLimit.max * 2, cfg.rateLimit.windowMs);
  const rl = limiter.check(`ndvi:${clientKey(request.headers, cfg.trustProxy)}`);
  if (!rl.allowed) return json({ error: "Too many requests. Please wait a moment." }, 429, { "retry-after": String(rl.retryAfterSeconds) });

  const q = new URL(request.url).searchParams;
  let lat: number, lon: number;
  let region: { id: string; name: string; nameMy: string } | null = null;
  const regionId = q.get("regionId");
  if (regionId) {
    const r = REGIONS.find((x) => x.id === regionId);
    if (!r) return json({ error: "Unknown regionId." }, 400);
    ({ lat, lon } = r);
    region = { id: r.id, name: r.name, nameMy: r.nameMy };
  } else {
    lat = Number(q.get("lat"));
    lon = Number(q.get("lon"));
    if (!q.get("lat") || !q.get("lon") || !Number.isFinite(lat) || !Number.isFinite(lon))
      return json({ error: "Give regionId, or lat and lon." }, 400);
    if (lat < MYANMAR_BOX.south || lat > MYANMAR_BOX.north || lon < MYANMAR_BOX.west || lon > MYANMAR_BOX.east)
      return json({ error: "The point must be inside Myanmar." }, 400);
  }

  try {
    const s = await fetchNdviSummary(lat, lon, cfg.nasaTimeoutMs, fetch, cfg.modisBaseUrl);
    return json({
      region,
      location: { lat, lon, windowKm: s.windowKm },
      product: "MOD13Q1 v061",
      band: "250m_16_days_NDVI",
      units: "NDVI (unitless, −0.2 to 1)",
      latest: s.latest,
      previous: s.previous,
      history: s.history,
      historyMean: s.historyMean,
      percentile: s.percentile,
      historyStatus: s.historyStatus,
      source: { ...NDVI_SOURCE, access: "https://modis.ornl.gov/data/modis_webservice.html" },
      notes: [
        "Each value is the mean of valid 250 m pixels within about 2 × 2 km of the point, for a 16-day composite starting on the given date.",
        "NDVI shows vegetation greenness. It is an observation, not a crop-yield estimate or a forecast. Clouds or flooding can lower it.",
      ],
      retrievedAt: s.retrievedAt,
    });
  } catch (err) {
    if (err instanceof NasaError) return json({ error: err.message }, 502);
    console.error("[earthlens-site] ndvi failed:", (err as Error)?.message);
    return json({ error: "Something went wrong while reading NASA MODIS data." }, 500);
  }
}
