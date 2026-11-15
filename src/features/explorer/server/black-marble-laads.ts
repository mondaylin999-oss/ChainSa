import "server-only";
import { TtlCache } from "@/features/earthlens-chat/server/cache";
import { bbox, pointInGeometry } from "@/features/earthlens-chat/server/nasa/firms";
import { ProviderError, isRecord } from "./http";

/**
 * NASA Black Marble VNP46A3 v002 (VIIRS/S-NPP monthly nighttime lights, 15 arc-second ≈ 500 m, 10° × 10° tiles)
 * read directly from NASA LAADS DAAC.
 * - Granule listing: public LAADS archive JSON (no login).
 * - Pixel values: LAADS OPeNDAP (Hyrax) subsets, which require a free NASA Earthdata Login token sent as
 *   `Authorization: Bearer` from the server only (env EARTHDATA_TOKEN). Only the rows/columns covering the
 *   selected boundary are requested, never whole 73 MB tiles.
 * Variables: AllAngle_Composite_Snow_Free (in v002 a Float32 already in nW·cm⁻²·sr⁻¹, scale_factor 1, _FillValue -999.9;
 * packing is read from each granule's metadata rather than assumed) and AllAngle_Composite_Snow_Free_Quality (0 good: more than 3 observations; 1 poor: 3 or fewer;
 * 2 gap-filled from history; 255 fill). Only quality 0 is used.
 */
export const LAADS = "https://ladsweb.modaps.eosdis.nasa.gov";
export const BLACK_MARBLE_LAADS = {
  product: "VNP46A3", collection: "5200", version: "002",
  variable: "AllAngle_Composite_Snow_Free", quality: "AllAngle_Composite_Snow_Free_Quality",
  // Defaults only; the real scale_factor, offset and _FillValue are read from each granule's metadata.
  scale: 1, offset: 0, fill: -999.9, pixelsPerDegree: 240, tilePixels: 2400, start: "2012-01-01",
  /**
   * Lit-pixel threshold (nW·cm⁻²·sr⁻¹) and the sensitivity thresholds also reported. 2 was chosen after a live
   * check of Jan–Mar 2024 over Yangon and Mandalay: at 0.5 and 1 the lit area jumped 89–324% and 31–69% in the
   * March haze/burning season as dim background pixels crossed the cut, while at 2 it changed +17–24%, in line
   * with mean radiance. Not an official NASA definition.
   */
  litThreshold: 2, sensitivity: [0.5, 1],
} as const;
const TIMEOUT_MS = 90_000;
const MAX_MONTHS = 12;
/** Maximum pixels requested per tile per variable; larger areas are sampled with a regular stride. */
const MAX_CELLS = 60_000;
/** A month is reported only when at least half of the boundary's sampled pixels have good-quality values. */
const MIN_VALID_SHARE = 0.5;

type Geometry = Parameters<typeof pointInGeometry>[2];
export type TokenStatus = "missing" | "valid" | "invalid" | "not-authorized" | "unavailable";
/** NASA CMR accepts Earthdata Login bearer tokens and answers 401 for unknown ones: a cheap validity check. */
const CMR_CHECK = "https://cmr.earthdata.nasa.gov/search/collections.json?short_name=VNP46A3&page_size=1";

export function earthdataToken() {
  return process.env.EARTHDATA_TOKEN?.trim() ?? "";
}

/** Black Marble 10° tile containing a point: h00–h35 from 180°W, v00–v17 from 90°N. */
export function tileFor(lat: number, lon: number) {
  return { h: Math.min(35, Math.floor((lon + 180) / 10)), v: Math.min(17, Math.floor((90 - lat) / 10)) };
}
export const tileId = (t: { h: number; v: number }) => `h${String(t.h).padStart(2, "0")}v${String(t.v).padStart(2, "0")}`;

/** First day of each month in the period with its day-of-year directory (LAADS stores monthly granules under it). */
export function monthDirectories(start: string, end: string) {
  const out: { month: string; year: number; doy: string }[] = [];
  const d = new Date(`${start.slice(0, 7)}-01T00:00:00Z`);
  while (d.toISOString().slice(0, 10) <= end) {
    const year = d.getUTCFullYear();
    const doy = Math.round((d.getTime() - Date.UTC(year, 0, 1)) / 86_400_000) + 1;
    out.push({ month: d.toISOString().slice(0, 10), year, doy: String(doy).padStart(3, "0") });
    d.setUTCMonth(d.getUTCMonth() + 1);
  }
  return out;
}

const listingCache = new TtlCache<Map<string, string>>(24 * 3600_000, 200);
/** Public LAADS listing of one monthly directory: tile id → granule file name. */
export function parseListing(payload: unknown): Map<string, string> {
  const items = Array.isArray(payload) ? payload : isRecord(payload) && Array.isArray(payload.content) ? payload.content : null;
  if (!items) throw new ProviderError("NASA LAADS returned an unreadable granule listing.");
  const map = new Map<string, string>();
  for (const item of items) {
    const name = isRecord(item) && typeof item.name === "string" ? item.name : "";
    const m = name.match(/^VNP46A3\.A\d{7}\.(h\d{2}v\d{2})\.002\.\d+\.h5$/);
    if (m) map.set(m[1], name);
  }
  return map;
}

/**
 * GET from LAADS as its documentation prescribes for tokens (`curl -L -b session -H "Authorization: Bearer …"`):
 * follow redirects that stay on the LAADS host, carrying session cookies. A redirect to any other host
 * (e.g. the Earthdata login page) is returned unfollowed, so the token is never sent off the LAADS host.
 */
async function laadsFetch(url: string, fetchImpl: typeof fetch, token?: string) {
  const host = new URL(LAADS).host;
  const cookies = new Map<string, string>();
  try {
    let current = url;
    for (let hop = 0; ; hop++) {
      const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};
      if (cookies.size) headers.Cookie = [...cookies].map(([k, v]) => `${k}=${v}`).join("; ");
      const res = await fetchImpl(current, { signal: AbortSignal.timeout(TIMEOUT_MS), redirect: "manual", cache: "no-store", headers });
      for (const c of res.headers.getSetCookie?.() ?? []) { const [pair] = c.split(";"); const i = pair.indexOf("="); if (i > 0) cookies.set(pair.slice(0, i).trim(), pair.slice(i + 1).trim()); }
      const location = res.headers.get("location");
      if (res.status < 300 || res.status >= 400 || !location || hop >= 5) return res;
      const next = new URL(location, current);
      // Login/licence pages mean LAADS did not accept the token: report that instead of following.
      if (next.host !== host || /\/oauth\/|\/profiles\/licenses/.test(next.pathname)) return res;
      current = next.toString();
    }
  } catch (error) {
    const timeout = error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError");
    throw new ProviderError(timeout ? "NASA LAADS DAAC did not respond in time. Try again shortly." : "NASA LAADS DAAC could not be reached. Try again shortly.");
  }
}

async function listing(year: number, doy: string, fetchImpl: typeof fetch) {
  const key = `${year}/${doy}`;
  const hit = listingCache.get(key);
  if (hit) return hit;
  const res = await laadsFetch(`${LAADS}/archive/allData/${BLACK_MARBLE_LAADS.collection}/${BLACK_MARBLE_LAADS.product}/${year}/${doy}.json`, fetchImpl);
  if (res.status === 404) { const empty = new Map<string, string>(); listingCache.set(key, empty); return empty; }
  if (!res.ok) throw new ProviderError(`NASA LAADS granule listing is unavailable (HTTP ${res.status}).`);
  const map = parseListing(await res.json());
  listingCache.set(key, map);
  return map;
}

const opendapUrl = (year: number, doy: string, file: string) => `${LAADS}/opendap/RemoteResources/laads/allData/${BLACK_MARBLE_LAADS.collection}/${BLACK_MARBLE_LAADS.product}/${year}/${doy}/${file}`;
/** A redirect to the LAADS login page (or 401/403) means the token is missing, expired or invalid. */
const isAuthFailure = (res: Response) => res.status === 401 || res.status === 403 || (res.status >= 300 && res.status < 400 && /oauth|login|urs\.earthdata|profiles\/licenses/i.test(res.headers.get("location") ?? ""));

const statusCache = new TtlCache<TokenStatus>(30 * 60_000, 4);
/**
 * Verifies the server's Earthdata token against a real Black Marble granule's metadata (cached 30 min), so the
 * catalogue reports "valid" only when NASA actually accepts it.
 */
export async function blackMarbleTokenStatus(fetchImpl: typeof fetch = fetch): Promise<TokenStatus> {
  const token = earthdataToken();
  if (!token) return "missing";
  const cached = statusCache.get(token.slice(-12));
  if (cached) return cached;
  let status: TokenStatus;
  try {
    const files = await listing(2024, "001", fetchImpl);
    const file = files.values().next().value;
    if (!file) throw new ProviderError("no granule");
    const res = await laadsFetch(`${opendapUrl(2024, "001", file)}.dmr`, fetchImpl, token);
    if (res.ok) status = "valid";
    else if (!isAuthFailure(res)) status = "unavailable";
    else {
      // LAADS refused it: distinguish a bad token from a valid token whose account has not yet authorized LAADS DAAC.
      const cmr = await fetchImpl(CMR_CHECK, { signal: AbortSignal.timeout(30_000), headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
      status = cmr.ok ? "not-authorized" : cmr.status === 401 ? "invalid" : "unavailable";
    }
  } catch {
    status = "unavailable";
  }
  statusCache.set(token.slice(-12), status);
  return status;
}

export interface VariableInfo { value: string[]; quality: string[]; scale: number; offset: number; fill: number }
const variableCache = new TtlCache<VariableInfo>(24 * 3600_000, 20);
/**
 * Candidate OPeNDAP names for the two variables, read from the granule's own DAP4 metadata (DMR) rather than
 * guessed: the full DAP4 path, the DAP2 flattened name, and the short name.
 */
export function variableNamesFromDmr(dmr: string) {
  const stack: string[] = [];
  const found: Record<string, string> = {};
  for (const tag of dmr.matchAll(/<(\/?)([A-Za-z0-9]+)([^>]*?)(\/?)>/g)) {
    const [, closing, kind, attrs, selfClosing] = tag;
    const name = attrs.match(/\bname="([^"]+)"/)?.[1];
    if (kind === "Group") { if (closing) stack.pop(); else if (name && !selfClosing) stack.push(name); continue; }
    if (!closing && name && (name === BLACK_MARBLE_LAADS.variable || name === BLACK_MARBLE_LAADS.quality)) found[name] = `/${[...stack, name].join("/")}`;
  }
  const candidates = (short: string) => {
    const path = found[short];
    return [...new Set([short, ...(path ? [path.slice(1).replaceAll("/", "_"), path] : [])])];
  };
  if (!found[BLACK_MARBLE_LAADS.variable] || !found[BLACK_MARBLE_LAADS.quality]) throw new ProviderError("The Black Marble granule metadata did not list the expected AllAngle_Composite_Snow_Free variables.");
  // Packing attributes of the radiance variable (VNP46A3 v002: Float32 already in nW·cm⁻²·sr⁻¹, scale 1, fill -999.9).
  const open = dmr.match(new RegExp(`<([A-Za-z0-9]+) name="${BLACK_MARBLE_LAADS.variable}"`));
  const from = open?.index ?? -1;
  const to = open ? dmr.indexOf(`</${open[1]}>`, from) : -1;
  const block = from >= 0 && to > from ? dmr.slice(from, to) : "";
  const attr = (name: string) => { const m = block.match(new RegExp(`<Attribute name="${name}"[^>]*>\\s*<Value>([^<]+)</Value>`)); const n = m ? Number(m[1].trim()) : NaN; return Number.isFinite(n) ? n : undefined; };
  return {
    value: candidates(BLACK_MARBLE_LAADS.variable), quality: candidates(BLACK_MARBLE_LAADS.quality),
    scale: attr("scale_factor") ?? BLACK_MARBLE_LAADS.scale, offset: attr("offset") ?? attr("add_offset") ?? BLACK_MARBLE_LAADS.offset, fill: attr("_FillValue") ?? BLACK_MARBLE_LAADS.fill,
  };
}

/** Parse a DAP2 ASCII (or DAP4 CSV) array response into rows of numbers, in row order. */
export function parseDapAscii(text: string): number[][] {
  const rows: number[][] = [];
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(/^\s*[^,\s]*\[(\d+)\](?:\[\d+\])?\s*,(.*)$/);
    if (!m) continue;
    rows.push(m[2].split(",").map(v => v.trim() === "" ? NaN : Number(v.trim())));
  }
  return rows;
}

async function readSubset(url: string, names: string[], range: string, token: string, fetchImpl: typeof fetch) {
  // Try DAP2 ASCII with each candidate name, then DAP4 CSV with the full path.
  const attempts = [...names.map(n => `${url}.ascii?${encodeURIComponent(n)}${range}`), ...names.filter(n => n.startsWith("/")).map(n => `${url}.dap.csv?dap4.ce=${encodeURIComponent(`${n}${range}`)}`)];
  for (const attempt of attempts) {
    const res = await laadsFetch(attempt, fetchImpl, token);
    if (isAuthFailure(res)) throw new ProviderError("NASA Earthdata rejected the server's EARTHDATA_TOKEN (missing, expired or invalid). Generate a new token at urs.earthdata.nasa.gov.");
    if (!res.ok) continue;
    const rows = parseDapAscii(await res.text());
    if (rows.length) return rows;
  }
  throw new ProviderError("NASA LAADS OPeNDAP did not return the requested Black Marble pixels.");
}

export interface BlackMarbleMonth { date: string; meanRadiance: number | null; litAreaKm2: number | null; sensitivityKm2: Record<string, number | null>; validShare: number; sampledPixels: number }

/** Pixel area of a 15 arc-second cell at a latitude (km²). */
export const pixelAreaKm2 = (lat: number) => ((111.32 / 240) ** 2) * Math.cos(lat * Math.PI / 180);

/**
 * Summarise one month for pixels inside the geometry: cos(latitude)-weighted mean radiance and lit area
 * (area of good-quality pixels at or above the threshold). Values from a strided sample are scaled by stride².
 */
export function summariseMonth(samples: { lat: number; value: number; quality: number; stride?: number }[], totalInside: number, stride = 1, packing: { scale: number; offset: number; fill: number } = BLACK_MARBLE_LAADS) {
  const { litThreshold, sensitivity } = BLACK_MARBLE_LAADS;
  const { scale, offset, fill } = packing;
  let wSum = 0, rSum = 0, valid = 0;
  const lit = new Map<number, number>([[litThreshold, 0], ...sensitivity.map(t => [t, 0] as [number, number])]);
  for (const s of samples) {
    // Fill (compared with a tolerance for Float32 values like -999.9000244), non-finite and negative values are invalid.
    if (s.quality !== 0 || !Number.isFinite(s.value) || Math.abs(s.value - fill) < 1e-3 || s.value < 0) continue;
    const radiance = s.value * scale + offset, w = Math.cos(s.lat * Math.PI / 180) * (s.stride ?? stride) ** 2, area = pixelAreaKm2(s.lat) * (s.stride ?? stride) ** 2;
    valid++; wSum += w; rSum += radiance * w;
    for (const t of lit.keys()) if (radiance >= t) lit.set(t, lit.get(t)! + area);
  }
  const validShare = totalInside ? valid / totalInside : 0;
  const ok = validShare >= MIN_VALID_SHARE;
  const round = (n: number) => Number(n.toFixed(2));
  return {
    meanRadiance: ok && wSum ? round(rSum / wSum) : null,
    litAreaKm2: ok ? round(lit.get(litThreshold)!) : null,
    sensitivityKm2: Object.fromEntries(sensitivity.map(t => [`${t}`, ok ? round(lit.get(t)!) : null])),
    validShare: Number(validShare.toFixed(3)), sampledPixels: totalInside,
  };
}

/** Rows/columns of a tile covered by a bounding box, with a stride keeping the request under MAX_CELLS. */
export function tileWindow(tile: { h: number; v: number }, box: [number, number, number, number]) {
  const ppd = BLACK_MARBLE_LAADS.pixelsPerDegree, n = BLACK_MARBLE_LAADS.tilePixels;
  const west = -180 + tile.h * 10, north = 90 - tile.v * 10;
  const c0 = Math.max(0, Math.floor((box[0] - west) * ppd)), c1 = Math.min(n - 1, Math.floor((box[2] - west) * ppd));
  const r0 = Math.max(0, Math.floor((north - box[3]) * ppd)), r1 = Math.min(n - 1, Math.floor((north - box[1]) * ppd));
  if (c0 > c1 || r0 > r1) return null;
  const stride = Math.max(1, Math.ceil(Math.sqrt(((r1 - r0 + 1) * (c1 - c0 + 1)) / MAX_CELLS)));
  return { r0, r1, c0, c1, stride, west, north };
}

const monthCache = new TtlCache<BlackMarbleMonth>(12 * 3600_000, 500);

/** Monthly Black Marble statistics over a boundary (or a fallback square around a point) from NASA LAADS. */
export async function fetchBlackMarbleLaads(geometry: Geometry, cacheKey: string, start: string, end: string, fetchImpl: typeof fetch = fetch) {
  const token = earthdataToken();
  if (!token) throw new ProviderError("EARTHDATA_TOKEN is not set on the server.");
  const months = monthDirectories(start, end);
  if (months.length > MAX_MONTHS) throw new ProviderError(`Choose a period of at most ${MAX_MONTHS} months.`);
  const box = bbox(geometry);
  const tiles: { h: number; v: number }[] = [];
  for (let h = tileFor(box[1], box[0]).h; h <= tileFor(box[1], box[2]).h; h++) for (let v = tileFor(box[3], box[0]).v; v <= tileFor(box[1], box[0]).v; v++) tiles.push({ h, v });
  const results: BlackMarbleMonth[] = [];
  // Sampling stride depends only on the boundary, so report it even when every month comes from the cache.
  const strideUsed = Math.max(1, ...tiles.map(t => tileWindow(t, box)?.stride ?? 1));
  // Months are independent: fetch up to three at a time (each month already fetches its tiles in parallel).
  const monthResult = async (m: (typeof months)[number]): Promise<BlackMarbleMonth> => {
    const key = `${cacheKey}:${m.month}`;
    const hit = monthCache.get(key);
    if (hit) return hit;
    const files = await listing(m.year, m.doy, fetchImpl);
    const samples: { lat: number; value: number; quality: number; stride: number }[] = [];
    let inside = 0, missingTile = false;
    const jobs = tiles.map(tile => ({ tile, w: tileWindow(tile, box), file: files.get(tileId(tile)) })).filter(j => j.w);
    if (jobs.some(j => !j.file)) missingTile = true;
    const ready = jobs.filter((j): j is { tile: { h: number; v: number }; w: NonNullable<ReturnType<typeof tileWindow>>; file: string } => Boolean(j.file));
    if (ready.length && !variableCache.get("names")) {
      const dmr = await laadsFetch(`${opendapUrl(m.year, m.doy, ready[0].file)}.dmr`, fetchImpl, token);
      if (isAuthFailure(dmr)) throw new ProviderError("NASA Earthdata rejected the server's EARTHDATA_TOKEN (missing, expired or invalid). Generate a new token at urs.earthdata.nasa.gov.");
      if (!dmr.ok) throw new ProviderError(`NASA LAADS OPeNDAP metadata is unavailable (HTTP ${dmr.status}).`);
      variableCache.set("names", variableNamesFromDmr(await dmr.text()));
    }
    const names = variableCache.get("names");
    // Tiles of one month are fetched in parallel (at most 4 for Myanmar) to keep large regions within the request time.
    const subsets = names ? await Promise.all(ready.map(async ({ w, file }) => {
      const url = opendapUrl(m.year, m.doy, file);
      const range = `[${w.r0}:${w.stride}:${w.r1}][${w.c0}:${w.stride}:${w.c1}]`;
      const [values, quality] = await Promise.all([readSubset(url, names.value, range, token, fetchImpl), readSubset(url, names.quality, range, token, fetchImpl)]);
      return { w, values, quality };
    })) : [];
    for (const { w, values, quality } of subsets) {
      values.forEach((row, i) => row.forEach((value, j) => {
        const lat = w.north - (w.r0 + i * w.stride + 0.5) / BLACK_MARBLE_LAADS.pixelsPerDegree;
        const lon = w.west + (w.c0 + j * w.stride + 0.5) / BLACK_MARBLE_LAADS.pixelsPerDegree;
        if (!pointInGeometry(lon, lat, geometry)) return;
        inside++;
        samples.push({ lat, value, quality: quality[i]?.[j] ?? 255, stride: w.stride });
      }));
    }
    // A month with a missing tile (not yet published) is reported as missing, never as a partial-area value.
    const summary = missingTile || !inside ? { meanRadiance: null, litAreaKm2: null, sensitivityKm2: {}, validShare: 0, sampledPixels: inside } : summariseMonth(samples, inside, 1, variableCache.get("names") ?? BLACK_MARBLE_LAADS);
    const month = { date: m.month, ...summary };
    if (!missingTile) monthCache.set(key, month);
    return month;
  };
  for (let i = 0; i < months.length; i += 3) results.push(...await Promise.all(months.slice(i, i + 3).map(monthResult)));
  return { months: results, stride: strideUsed, tiles: tiles.map(tileId) };
}
