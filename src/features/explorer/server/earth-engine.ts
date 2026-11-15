import "server-only";
import sdk from "@google/earthengine";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { TtlCache } from "@/features/earthlens-chat/server/cache";
import { pointInGeometry, regionGeometry } from "@/features/earthlens-chat/server/nasa/firms";
import type { Region } from "@/features/earthlens-chat/regions";
import { EARTH_ENGINE_SETUP_MESSAGE, SATELLITE_PRODUCTS, URBAN_MASK, type SatelliteProduct } from "../satellite-products";

// The published SDK types omit most server-side image operators. Keep its dynamic
// API at this boundary; validate all external results before returning chart data.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ee = sdk as any;
type Geometry = Parameters<typeof pointInGeometry>[2];
type Row = { date: string; value: number | null; validAreaKm2: number | null };
interface Result { observations: Row[]; geographicCoverage: string; spatialSelection: "polygon-mean" | "representative-point"; qaPolicy: string }
let initialization: Promise<void> | undefined;
let boundaries: Promise<Map<string, Geometry>> | undefined;
const cache = new TtlCache<Result>(6 * 60 * 60 * 1000, 150);

export function earthEngineConfigured() {
  return Boolean(process.env.EARTH_ENGINE_PROJECT_ID?.trim() && process.env.EARTH_ENGINE_SERVICE_ACCOUNT_JSON?.trim());
}

async function initialize() {
  if (!earthEngineConfigured()) throw new Error(EARTH_ENGINE_SETUP_MESSAGE);
  if (!initialization) {
    initialization = new Promise<void>((resolve, reject) => {
      let key: { client_email: string; private_key: string };
      try {
        key = JSON.parse(process.env.EARTH_ENGINE_SERVICE_ACCOUNT_JSON!);
        if (typeof key.client_email !== "string" || typeof key.private_key !== "string") throw new Error();
      } catch { reject(new Error("The site's satellite access settings need to be corrected.")); return; }
      const fail = () => reject(new Error("Google Earth Engine access is not ready. Check project registration and the site's service account permissions."));
      ee.data.authenticateViaPrivateKey(key, () => {
        ee.data.setDeadline(90000);
        ee.initialize(null, null, resolve, fail, null, process.env.EARTH_ENGINE_PROJECT_ID!.trim());
      }, fail, ["https://www.googleapis.com/auth/earthengine.readonly"], true);
    }).catch(error => { initialization = undefined; throw error; });
  }
  return initialization;
}

export async function selectionBoundary(region: Region, townshipId?: string): Promise<Geometry | undefined> {
  if (townshipId) {
    boundaries ??= readFile(join(process.cwd(), "public", "township-boundaries.geojson"), "utf8").then(text => {
      const json = JSON.parse(text) as { features: { properties: { TS_PCODE: string }; geometry: Geometry }[] };
      return new Map(json.features.map(feature => [feature.properties.TS_PCODE, feature.geometry]));
    });
    const geometry = (await boundaries).get(townshipId);
    if (!geometry) throw new Error("The selected township boundary could not be loaded.");
    return geometry;
  }
  return regionGeometry(region.iso);
}

async function geometryFor(region: Region, townshipId?: string) {
  const geometry = await selectionBoundary(region, townshipId);
  if (geometry) return { geometry: ee.Geometry(geometry).simplify(townshipId ? 30 : 100), spatialSelection: "polygon-mean" as const, note: townshipId ? "Pixels inside the selected MIMU township boundary (simplified by up to 30 m for processing)." : "Pixels inside the bundled state/region boundary (simplified by up to 100 m)." };
  return { geometry: ee.Geometry.Point([region.lon, region.lat]).buffer(10000), spatialSelection: "representative-point" as const, note: "Pixels within 10 km of the regional reference point; a complete region boundary is not bundled for this area." };
}

export function parseSatelliteRows(value: unknown): Row[] {
  if (!Array.isArray(value)) throw new Error("The satellite service returned an unreadable result.");
  return value.map(row => {
    if (!row || typeof row !== "object" || typeof row.date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(row.date)) throw new Error("The satellite service returned invalid observation dates.");
    return { date: row.date, value: typeof row.value === "number" && Number.isFinite(row.value) ? row.value : null, validAreaKm2: typeof row.validAreaKm2 === "number" && Number.isFinite(row.validAreaKm2) ? row.validAreaKm2 : null };
  }).sort((a,b) => a.date.localeCompare(b.date));
}

/**
 * NASA MCD12Q1 urban/built-up (class 13) mask: the latest published map not after the observation year
 * (the first map for earlier observations). No hard-coded last year, so new releases are used automatically.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function urbanMask(image: any) {
  const year = ee.Number(ee.Date(image.get("system:time_start")).get("year")).max(URBAN_MASK.firstYear);
  const maps = ee.ImageCollection(URBAN_MASK.collection).filter(ee.Filter.calendarRange(URBAN_MASK.firstYear, year, "year")).sort("system:time_start", false);
  const cover = ee.Image(maps.first()).select(URBAN_MASK.band);
  return cover.eq(URBAN_MASK.urbanClass).updateMask(cover.gte(1).and(cover.lte(17)));
}

/** MOD11A2 daytime LST in °C with the same quality rule as the general LST product. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function lstCelsius(image: any) {
  const raw = image.select("LST_Day_1km");
  const qa = image.select("QC_Day");
  return raw.updateMask(raw.gte(7500).and(qa.bitwiseAnd(3).eq(0)).and(qa.rightShift(6).bitwiseAnd(3).eq(0))).multiply(0.02).subtract(273.15);
}

/** Raster value and validity mask; product fill values never become zeros. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function metricImage(image: any, product: SatelliteProduct, baseline: any) {
  const raw = image.select(product.band);
  switch (product.metric) {
    case "tree-cover": return raw.updateMask(raw.gte(0).and(raw.lte(100)));
    case "lst": return lstCelsius(image);
    case "burned": {
      // MCD64A1 BurnDate: 1–366 burned, 0 unburned, -1 unmapped, -2 water. QA bit 0 = land, bit 1 = valid data.
      const qa = image.select("QA");
      return raw.gte(1).and(raw.lte(366)).multiply(100).updateMask(raw.gte(0).and(qa.bitwiseAnd(3).eq(3)));
    }
    case "urban-ndvi": {
      // MOD13Q1 NDVI: valid range -2000..10000, scale 0.0001; SummaryQA 0 = good, 1 = marginal but usable.
      const ndvi = raw.updateMask(raw.gte(-2000).and(raw.lte(10000)).and(image.select("SummaryQA").lte(1))).multiply(0.0001);
      // Land cover (500 m) is coarser than NDVI (250 m): each NDVI pixel takes the class of the land-cover pixel it falls in.
      return ndvi.updateMask(urbanMask(image).eq(1));
    }
    case "urban-lst": {
      const lst = lstCelsius(image);
      // Aggregate the 500 m urban mask to the 1 km LST grid and keep pixels that are at least half built-up.
      const urbanShare = urbanMask(image).unmask(0).reduceResolution({ reducer: ee.Reducer.mean(), maxPixels: 64 }).reproject({ crs: raw.projection() });
      return lst.updateMask(urbanShare.gte(0.5));
    }
    case "et": return raw.updateMask(raw.gte(-32767).and(raw.lte(32700)).and(image.select("ET_QC").bitwiseAnd(1).eq(0))).multiply(0.1);
    case "water": return raw.eq(2).multiply(100).updateMask(raw.gt(0));
    case "lights": return raw.updateMask(image.select("cf_cvg").gt(0));
    default: {
      const valid = raw.gte(1).and(raw.lte(17));
      if (product.metric === "built-up") return raw.eq(13).multiply(100).updateMask(valid);
      const base = baseline.select(product.band);
      const common = valid.and(base.gte(1)).and(base.lte(17));
      if (product.metric === "land-change") return raw.neq(base).multiply(100).updateMask(common);
      if (product.metric === "built-change") return raw.eq(13).subtract(base.eq(13)).multiply(100).updateMask(common);
      return raw.eq(12).or(raw.eq(14)).subtract(base.eq(12).or(base.eq(14))).multiply(100).updateMask(common);
    }
  }
}

export async function fetchSatelliteObservations(datasetId: string, region: Region, townshipId: string | undefined, start: string, end: string): Promise<Result> {
  const product = SATELLITE_PRODUCTS[datasetId];
  if (!product) throw new Error("Choose a supported satellite dataset.");
  const key = `${datasetId}:${region.id}:${townshipId ?? ""}:${start}:${end}`;
  const hit = cache.get(key);
  if (hit) return hit;
  await initialize();
  const area = await geometryFor(region, townshipId);
  const until = new Date(`${end}T00:00:00Z`); until.setUTCDate(until.getUTCDate()+1);
  const collection = ee.ImageCollection(product.collection).filterDate(start, until.toISOString().slice(0,10)).filterBounds(area.geometry).sort("system:time_start");
  // Enforce a server-side request bound before raster work; do not silently truncate.
  const count = await new Promise<number>((resolve, reject) => collection.size().evaluate((n: number, error: string) => error ? reject(new Error("Satellite dates could not be retrieved. Please try again.")) : resolve(n)));
  if (count > 60) throw new Error("This selection has more than 60 satellite observations. Choose a shorter period.");
  if (count === 0) return { observations: [], geographicCoverage: area.note, spatialSelection: area.spatialSelection, qaPolicy: product.limitations };
  const baseline = ee.Image(collection.first());
  const makeRow = (element: unknown) => {
    const image = ee.Image(element);
    const metric = metricImage(image, product, baseline).rename("value");
    const pixelArea = ee.Image.pixelArea().updateMask(metric.mask());
    const options = { geometry: area.geometry, scale: product.scale, maxPixels: 2e9, tileScale: 4 };
    // Area-weighted average remains comparable across projection edges and partial pixels.
    const totals = metric.multiply(pixelArea).addBands(pixelArea.rename("area")).reduceRegion({ ...options, reducer: ee.Reducer.sum() });
    const numerator = totals.get("value");
    const denominator = totals.get("area");
    const hasArea = ee.Algorithms.If(denominator, ee.Number(denominator).gt(0), false);
    return ee.Dictionary({ date: ee.Date(image.get("system:time_start")).format("YYYY-MM-dd"), value: ee.Algorithms.If(hasArea, ee.Number(numerator).divide(denominator), null), validAreaKm2: ee.Algorithms.If(hasArea, ee.Number(denominator).divide(1e6), null) });
  };
  const observations: Row[] = [];
  for (let offset = 0; offset < count; offset += 10) {
    const rows = collection.toList(Math.min(10, count-offset), offset).map(makeRow);
    const raw = await new Promise<unknown>((resolve, reject) => rows.evaluate((result: unknown, error: string) => error ? reject(new Error("Satellite observations could not be calculated. Please try a shorter period or another area.")) : resolve(result)));
    observations.push(...parseSatelliteRows(raw));
  }
  const result: Result = { observations, geographicCoverage: `${area.note} Area-weighted mean over valid ${product.scale} m product pixels. ${product.cadence}; values retain their published dates.`, spatialSelection: area.spatialSelection, qaPolicy: product.limitations };
  cache.set(key, result);
  return result;
}

/**
 * NASA Black Marble VNP46A2 v002 (VIIRS/S-NPP daily BRDF-, lunar- and atmosphere-corrected nighttime lights, 500 m),
 * aggregated to monthly means in Google Earth Engine (used only as a processing platform for the NASA product).
 * Quality: Mandatory_Quality_Flag 0–1 (high quality, persistent or ephemeral), cloud confidence "confident" or
 * "probably clear" (QF_Cloud_Mask bits 6–7 ≤ 1) and no snow. Values in nW·cm⁻²·sr⁻¹.
 */
export const BLACK_MARBLE = {
  collection: "NASA/VIIRS/002/VNP46A2", band: "DNB_BRDF_Corrected_NTL", start: "2012-01-19", scale: 500,
  /** Lit-pixel threshold on the monthly mean radiance (nW·cm⁻²·sr⁻¹); see catalog limitations for its meaning. */
  litThreshold: 0.5,
} as const;
const MAX_BLACK_MARBLE_MONTHS = 36;

export function blackMarbleMonths(start: string, end: string) {
  const out: string[] = [];
  const d = new Date(`${start.slice(0, 7)}-01T00:00:00Z`);
  while (d.toISOString().slice(0, 10) <= end) { out.push(d.toISOString().slice(0, 10)); d.setUTCMonth(d.getUTCMonth() + 1); }
  return out;
}

export async function fetchBlackMarbleMonthly(kind: "radiance" | "lit-area", region: Region, townshipId: string | undefined, start: string, end: string): Promise<Result> {
  const months = blackMarbleMonths(start, end);
  if (months.length > MAX_BLACK_MARBLE_MONTHS) throw new Error(`Choose a period of at most ${MAX_BLACK_MARBLE_MONTHS} months.`);
  const key = `bm:${kind}:${region.id}:${townshipId ?? ""}:${start}:${end}`;
  const hit = cache.get(key);
  if (hit) return hit;
  await initialize();
  const area = await geometryFor(region, townshipId);
  const daily = ee.ImageCollection(BLACK_MARBLE.collection).filterBounds(area.geometry);
  const options = { geometry: area.geometry, scale: BLACK_MARBLE.scale, maxPixels: 2e9, tileScale: 4 };
  const row = (month: string) => {
    const s = ee.Date(month), e = s.advance(1, "month");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const filtered = daily.filterDate(s, e).map((img: any) => {
      const quality = img.select("Mandatory_Quality_Flag").lte(1);
      const clear = img.select("QF_Cloud_Mask").rightShift(6).bitwiseAnd(3).lte(1);
      const noSnow = img.select("Snow_Flag").eq(0);
      return img.select(BLACK_MARBLE.band).updateMask(quality.and(clear).and(noSnow));
    });
    const mean = filtered.mean().rename("value");
    const pixelArea = ee.Image.pixelArea().updateMask(mean.mask());
    const metric = kind === "radiance" ? mean.multiply(pixelArea) : mean.gte(BLACK_MARBLE.litThreshold).multiply(pixelArea);
    const totals = metric.rename("value").addBands(pixelArea.rename("area")).reduceRegion({ ...options, reducer: ee.Reducer.sum() });
    const numerator = totals.get("value"), denominator = totals.get("area");
    const hasArea = ee.Algorithms.If(denominator, ee.Number(denominator).gt(0), false);
    const value = kind === "radiance" ? ee.Algorithms.If(hasArea, ee.Number(numerator).divide(denominator), null) : ee.Algorithms.If(hasArea, ee.Number(numerator).divide(1e6), null);
    return ee.Dictionary({ date: month, value, validAreaKm2: ee.Algorithms.If(hasArea, ee.Number(denominator).divide(1e6), null) });
  };
  const raw = await new Promise<unknown>((resolve, reject) => ee.List(months.map(row)).evaluate((result: unknown, error: string) => error ? reject(new Error("Black Marble nighttime lights could not be calculated. Please try a shorter period or another area.")) : resolve(result)));
  const result: Result = {
    observations: parseSatelliteRows(raw), spatialSelection: area.spatialSelection, qaPolicy: "Mandatory_Quality_Flag 0–1, cloud confidence clear or probably clear, no snow.",
    geographicCoverage: `${area.note} ${kind === "radiance" ? "Area-weighted mean of monthly mean radiance" : `Area of 500 m pixels whose monthly mean radiance is at least ${BLACK_MARBLE.litThreshold} nW·cm⁻²·sr⁻¹`} over valid pixels; each value is dated to the first day of its month.`,
  };
  cache.set(key, result);
  return result;
}
