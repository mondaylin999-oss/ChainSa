import "server-only";
import { TtlCache } from "@/features/earthlens-chat/server/cache";
import { SATELLITE_PRODUCTS, URBAN_MASK, urbanMaskYear, type SatelliteMetric, type SatelliteProduct } from "../satellite-products";

export const PUBLIC_MODIS_DATASETS = new Set(["forest-cover", "land-surface-temperature", "land-cover-change", "built-up-area", "settlement-expansion", "land-use-change", "evapotranspiration", "urban-vegetation", "urban-surface-temperature", "burned-area"]);
/** Pixel grid of an ORNL subset window (MODIS sinusoidal metres); rows run north to south. */
export interface Grid { xll: number; yll: number; cellsize: number; nrows: number; ncols: number }
const coverCache = new TtlCache<{ grid: Grid | undefined; data: unknown[] }>(24*3600000,150);
const BASE = "https://modis.ornl.gov/rst/api/v1";
export interface Raster { calendar_date: string; modis_date: string; band: string; data: unknown[] }
interface Observation { date: string; value: number | null }
const dateCache = new TtlCache<{calendar_date:string;modis_date:string}[]>(12*3600000,150);
const resultCache = new TtlCache<Observation[]>(6*3600000,150);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** NASA ORNL DAAC subsets routinely take 30–60 s per request, so allow 90 s each. */
export const ORNL_TIMEOUT_MS = 90_000;
const RETRY_DELAY_MS = 2_000;
const UNAVAILABLE = "NASA's satellite subset service is temporarily unavailable. Try again shortly.";

async function json(url: string, fetchImpl: typeof fetch, retryDelayMs = RETRY_DELAY_MS) {
  // One retry for the intermittent gateway errors (502/503/504) ORNL returns; timeouts are not retried.
  for (let attempt = 0; ; attempt++) {
    let response: Response;
    try {
      response = await fetchImpl(url,{signal:AbortSignal.timeout(ORNL_TIMEOUT_MS),headers:{Accept:"application/json"},cache:"no-store"});
    } catch (error) {
      if (error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError")) throw new Error("NASA's satellite subset service did not respond within 90 seconds. Try again shortly or choose a shorter period.");
      throw new Error(UNAVAILABLE);
    }
    if (response.ok) {
      // ORNL sometimes returns an HTML error page with a 200 status.
      try { return await response.json() as unknown; } catch { throw new Error(UNAVAILABLE); }
    }
    if (attempt === 0 && [502, 503, 504].includes(response.status)) { await new Promise(resolve => setTimeout(resolve, retryDelayMs)); continue; }
    throw new Error(UNAVAILABLE);
  }
}

function parseDates(payload: unknown): {calendar_date:string;modis_date:string}[] {
  if (!isRecord(payload) || !Array.isArray(payload.dates)) throw new Error("NASA returned an unreadable satellite date list.");
  return payload.dates.map(date => {
    if (!isRecord(date) || typeof date.calendar_date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date.calendar_date) ||
        typeof date.modis_date !== "string" || !/^A\d{7}$/.test(date.modis_date)) {
      throw new Error("NASA returned an invalid satellite date.");
    }
    return {calendar_date:date.calendar_date,modis_date:date.modis_date};
  });
}

function parseRasters(payload: unknown): Raster[] {
  if (!isRecord(payload) || !Array.isArray(payload.subset)) throw new Error("NASA returned an unreadable satellite subset.");
  return payload.subset.map(row => {
    if (!isRecord(row) || typeof row.calendar_date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(row.calendar_date) ||
        typeof row.modis_date !== "string" || !/^A\d{7}$/.test(row.modis_date) ||
        typeof row.band !== "string" || !row.band || !Array.isArray(row.data)) {
      throw new Error("NASA returned an invalid satellite subset row.");
    }
    return {calendar_date:row.calendar_date,modis_date:row.modis_date,band:row.band,data:row.data};
  });
}

function toNumber(value: unknown) {
  const n = typeof value === "string" && value.trim() ? Number(value) : value;
  return typeof n === "number" && Number.isFinite(n) ? n : undefined;
}

export function parseGrid(payload: unknown): Grid | undefined {
  if (!isRecord(payload)) return undefined;
  const [xll, yll, cellsize, nrows, ncols] = ["xllcorner", "yllcorner", "cellsize", "nrows", "ncols"].map(key => toNumber(payload[key]));
  if (xll === undefined || yll === undefined || !cellsize || !nrows || !ncols) return undefined;
  return { xll, yll, cellsize, nrows, ncols };
}

/**
 * Which pixels of a value raster are built-up, using a NASA MCD12Q1 land-cover raster of the same window.
 * "centre": the land-cover pixel under the value pixel's centre is urban (value pixels finer than land cover, e.g. 250 m NDVI).
 * "share": at least half of the land-cover pixels whose centres fall inside the value pixel are urban (coarser value pixels, e.g. 1 km LST).
 * Both windows are centred on the same point, so without grid headers they are matched by relative position.
 */
export function urbanPixelMask(valueCount: number, valueGrid: Grid | undefined, cover: unknown[], coverGrid: Grid | undefined, mode: "centre" | "share"): boolean[] {
  const urban = (v: unknown) => v === URBAN_MASK.urbanClass;
  const valid = (v: unknown) => typeof v === "number" && v >= 1 && v <= 17;
  const gridded = valueGrid && coverGrid && valueGrid.nrows*valueGrid.ncols === valueCount && coverGrid.nrows*coverGrid.ncols === cover.length;
  const side = Math.round(Math.sqrt(valueCount)), coverSide = Math.round(Math.sqrt(cover.length));
  const square = side*side === valueCount && coverSide*coverSide === cover.length;
  return Array.from({ length: valueCount }, (_, i) => {
    if (!gridded) {
      if (!square) return false;
      const r = Math.floor((Math.floor(i/side)+.5)/side*coverSide), c = Math.floor((i%side+.5)/side*coverSide);
      return urban(cover[r*coverSide+c]);
    }
    const v = valueGrid!, g = coverGrid!;
    const left = v.xll + (i%v.ncols)*v.cellsize, top = v.yll + (v.nrows-Math.floor(i/v.ncols))*v.cellsize;
    const centre = () => {
      const c = Math.floor((left + v.cellsize/2 - g.xll)/g.cellsize), r = g.nrows - 1 - Math.floor((top - v.cellsize/2 - g.yll)/g.cellsize);
      return c >= 0 && c < g.ncols && r >= 0 && r < g.nrows && urban(cover[r*g.ncols+c]);
    };
    if (mode === "centre") return centre();
    let total = 0, built = 0;
    cover.forEach((value, j) => {
      const x = g.xll + (j%g.ncols+.5)*g.cellsize, y = g.yll + (g.nrows-Math.floor(j/g.ncols)-.5)*g.cellsize;
      if (x >= left && x < left+v.cellsize && y <= top && y > top-v.cellsize && valid(value)) { total++; if (urban(value)) built++; }
    });
    return total ? built/total >= .5 : centre();
  });
}

export function publicModisValue(metric: SatelliteMetric, data: unknown[], quality: unknown[] = [], baseline: unknown[] = [], urbanPixels: boolean[] = []): number | null {
  const values: number[] = [];
  for (let i=0;i<data.length;i++) {
    const raw=data[i], qa=quality[i], previous=baseline[i];
    if (typeof raw!=="number" || !Number.isFinite(raw)) continue;
    if ((metric==="urban-ndvi"||metric==="urban-lst") && !urbanPixels[i]) continue;
    if (metric==="tree-cover") { if(raw>=0&&raw<=100) values.push(raw); }
    // MOD13Q1 NDVI (scale 0.0001); pixel reliability 0 = good, 1 = marginal; -1 fill, 2 snow/ice, 3 cloudy are dropped.
    // MCD64A1 Burn_Date: 1–366 burned, 0 unburned, negative = fill/water; QA bits 0 (land) and 1 (valid data) must be set.
    else if (metric==="burned") { if(raw>=0&&raw<=366&&typeof qa==="number"&&(qa&3)===3) values.push(raw>=1?100:0); }
    else if (metric==="urban-ndvi") { if(raw>=-2000&&raw<=10000&&(qa===0||qa===1)) values.push(raw*.0001); }
    else if (metric==="lst"||metric==="urban-lst") { if(raw>=7500&&raw<=65535&&typeof qa==="number"&&(qa&3)===0&&((qa>>6)&3)===0) values.push(raw*.02-273.15); }
    else if (metric==="et") { if(raw>=-32767&&raw<=32700&&typeof qa==="number"&&(qa&1)===0) values.push(raw*.1); }
    else if(raw>=1&&raw<=17) {
      if(metric==="built-up") values.push(raw===13?100:0);
      else if(typeof previous==="number"&&previous>=1&&previous<=17) {
        if(metric==="land-change") values.push(raw!==previous?100:0);
        else if(metric==="built-change") values.push(((raw===13?1:0)-(previous===13?1:0))*100);
        else if(metric==="crop-change") values.push((([12,14].includes(raw)?1:0)-([12,14].includes(previous)?1:0))*100);
      }
    }
  }
  return values.length?Number((values.reduce((sum,n)=>sum+n,0)/values.length).toFixed(4)):null;
}

/** Published dates in [start, end] and all bands for them, from the free ORNL DAAC point-subset service (10 dates per request). */
/** NASA's published dates for a product at a location: the source of truth for what exists (cached 12 h). */
async function publishedDates(name:string,loc:string,fetchImpl:typeof fetch) {
  const dateKey=`${name}:${loc}`;
  let all=dateCache.get(dateKey);
  if(!all) {
    all=parseDates(await json(`${BASE}/${name}/dates?${loc}`,fetchImpl));
    dateCache.set(dateKey,all!);
  }
  return all!;
}

export async function fetchSubsets(name:string,lat:number,lon:number,start:string,end:string,fetchImpl:typeof fetch,km=1,maxDates=60) {
  const loc=`latitude=${lat.toFixed(4)}&longitude=${lon.toFixed(4)}`;
  const all=await publishedDates(name,loc,fetchImpl);
  const dates=all.filter(d=>d.calendar_date>=start&&d.calendar_date<=end).sort((a,b)=>a.calendar_date.localeCompare(b.calendar_date));
  if(dates.length>maxDates)throw new Error(`Choose a shorter range with at most ${maxDates} satellite observations.`);
  const rasters:Raster[]=[];
  let grid:Grid|undefined;
  for(let i=0;i<dates.length;i+=10) {
    const batch=dates.slice(i,i+10);
    // Request all product bands together so science and quality pixels stay aligned.
    const payload=await json(`${BASE}/${name}/subset?${loc}&startDate=${batch[0].modis_date}&endDate=${batch.at(-1)!.modis_date}&kmAboveBelow=${km}&kmLeftRight=${km}`,fetchImpl);
    grid??=parseGrid(payload);
    rasters.push(...parseRasters(payload));
  }
  return {loc,dates,rasters,grid};
}

export async function fetchPublicModis(datasetId:string,lat:number,lon:number,start:string,end:string,fetchImpl:typeof fetch=fetch) {
  const product=SATELLITE_PRODUCTS[datasetId];
  if(!product||!PUBLIC_MODIS_DATASETS.has(datasetId)) throw new Error("This product needs the site's Earth Engine connection.");
  const key=`${datasetId}:${lat.toFixed(4)},${lon.toFixed(4)}:${start}:${end}`;
  const hit=resultCache.get(key);if(hit)return hit;
  const {loc,dates,rasters,grid}=await fetchSubsets(product.collection.split("/").at(-1)!,lat,lon,start,end,fetchImpl);
  const {band,qaBand}=subsetBands(product);
  if(dates.length&&!rasters.some(r=>r.band===band))throw new Error(`NASA did not include the expected ${band} band in its satellite response.`);
  if(dates.length&&qaBand&&!rasters.some(r=>r.band===qaBand))throw new Error(`NASA did not include the expected ${qaBand} quality band in its satellite response.`);
  const urbanMasks=new Map<number,boolean[]>();
  let coverYears:{year:number;modis_date:string}[]=[];
  if((product.metric==="urban-ndvi"||product.metric==="urban-lst")&&dates.length) {
    const pixels=rasters.find(r=>r.band===band)?.data.length??0;
    // Use NASA's published MCD12Q1 years rather than a hard-coded last year.
    coverYears=(await publishedDates(URBAN_MASK.collection.split("/").at(-1)!,loc,fetchImpl)).map(d=>({year:Number(d.calendar_date.slice(0,4)),modis_date:d.modis_date}));
    for(const year of new Set(dates.map(d=>urbanMaskYear(d.calendar_date,coverYears.map(c=>c.year))))) {
      const cover=await landCover(year,coverYears.find(c=>c.year===year)!.modis_date,loc,fetchImpl);
      urbanMasks.set(year,urbanPixelMask(pixels,grid,cover.data,cover.grid,product.metric==="urban-lst"?"share":"centre"));
    }
  }
  const baseline=rasters.find(r=>r.calendar_date===dates[0]?.calendar_date&&r.band===band)?.data;
  if(dates.length&&["land-change","built-change","crop-change"].includes(product.metric)&&!baseline?.length)throw new Error("NASA did not include the baseline land-cover pixels needed to calculate change.");
  const observations=dates.map(d=>{
    const row=rasters.find(r=>r.calendar_date===d.calendar_date&&r.band===band);
    const qa=rasters.find(r=>r.calendar_date===d.calendar_date&&r.band===qaBand)?.data??[];
    return{date:d.calendar_date,value:row?publicModisValue(product.metric,row.data,qa,baseline??[],coverYears.length?urbanMasks.get(urbanMaskYear(d.calendar_date,coverYears.map(c=>c.year))):undefined):null};
  });
  resultCache.set(key,observations);return observations;
}

/** ORNL subset band names differ from the Earth Engine band names for some products. */
function subsetBands(product: SatelliteProduct): {band:string;qaBand?:string} {
  switch(product.metric) {
    case "lst": case "urban-lst": return {band:"LST_Day_1km",qaBand:"QC_Day"};
    case "et": return {band:"ET_500m",qaBand:"ET_QC_500m"};
    case "burned": return {band:"Burn_Date",qaBand:"QA"};
    case "urban-ndvi": return {band:"250m_16_days_NDVI",qaBand:"250m_16_days_pixel_reliability"};
    default: return {band:product.band};
  }
}

/** NASA MCD12Q1 v061 IGBP land cover for one year around the same point (free ORNL DAAC subset, no key). */
async function landCover(year:number,modisDate:string,loc:string,fetchImpl:typeof fetch) {
  const key=`${year}:${loc}`;
  const hit=coverCache.get(key);if(hit)return hit;
  const name=URBAN_MASK.collection.split("/").at(-1)!;
  const payload=await json(`${BASE}/${name}/subset?${loc}&startDate=${modisDate}&endDate=${modisDate}&kmAboveBelow=1&kmLeftRight=1`,fetchImpl);
  const row=parseRasters(payload).find(r=>r.band===URBAN_MASK.band);
  if(!row)throw new Error(`NASA did not include the ${name} ${URBAN_MASK.band} land-cover band needed to locate built-up pixels for ${year}.`);
  const result={grid:parseGrid(payload),data:row.data};
  coverCache.set(key,result);return result;
}

/** IGBP Land Cover Type 1 classes used by NASA MCD12Q1 (LC_Type1). */
export const IGBP_CLASSES: Record<number,string> = {
  1:"Evergreen needleleaf forest",2:"Evergreen broadleaf forest",3:"Deciduous needleleaf forest",4:"Deciduous broadleaf forest",5:"Mixed forest",
  6:"Closed shrubland",7:"Open shrubland",8:"Woody savanna",9:"Savanna",10:"Grassland",11:"Permanent wetland",12:"Cropland",
  13:"Urban and built-up",14:"Cropland/natural vegetation mosaic",15:"Permanent snow and ice",16:"Barren",17:"Water bodies",
};
export interface LandCoverYear { date:string; value:number|null; dominantClass:number|null; classShares:Record<string,number> }

/** Share (%) of each valid IGBP class among the pixels of one land-cover raster. */
export function landCoverShares(data: unknown[]): Record<string,number> {
  const counts=new Map<number,number>();let total=0;
  for(const v of data) if(typeof v==="number"&&v>=1&&v<=17){counts.set(v,(counts.get(v)??0)+1);total++;}
  return Object.fromEntries([...counts].sort((a,b)=>b[1]-a[1]).map(([c,n])=>[IGBP_CLASSES[c],Number((n/total*100).toFixed(1))]));
}

/**
 * Annual NASA MCD12Q1 v061 class breakdown around a point. Each year's value is the share of the class that is
 * most common over the whole selected period, so the series follows one class rather than switching between classes.
 */
export async function fetchLandCoverClasses(lat:number,lon:number,start:string,end:string,fetchImpl:typeof fetch=fetch) {
  const {dates,rasters}=await fetchSubsets(URBAN_MASK.collection.split("/").at(-1)!,lat,lon,start,end,fetchImpl);
  const byYear=dates.map(d=>({date:d.calendar_date,data:rasters.find(r=>r.calendar_date===d.calendar_date&&r.band===URBAN_MASK.band)?.data}));
  if(dates.length&&!byYear.some(y=>y.data))throw new Error(`NASA did not include the expected ${URBAN_MASK.band} band in its satellite response.`);
  const shares=byYear.map(y=>({date:y.date,shares:y.data?landCoverShares(y.data):{}}));
  const totals=new Map<string,number>();
  for(const y of shares) for(const [c,p] of Object.entries(y.shares)) totals.set(c,(totals.get(c)??0)+p);
  const dominant=[...totals].sort((a,b)=>b[1]-a[1])[0]?.[0]??null;
  const dominantId=dominant?Number(Object.entries(IGBP_CLASSES).find(([,n])=>n===dominant)![0]):null;
  const years:LandCoverYear[]=shares.map(y=>({date:y.date,value:Object.keys(y.shares).length&&dominant?(y.shares[dominant]??0):null,dominantClass:dominantId,classShares:y.shares}));
  return {years,dominant};
}

/**
 * Window returned by an ORNL subset request with kmAboveBelow=1 and kmLeftRight=1 (MODIS sinusoidal grid).
 * Verified against live responses: 250 m products 9 × 9, 500 m 5 × 5, 1 km 3 × 3 pixels.
 */
export function subsetWindow(scale: number, km = 1) {
  const cellMeters = scale <= 250 ? 231.656 : scale <= 500 ? 463.313 : 926.625;
  // ORNL returns 2·floor(km·1000 / cell) + 1 pixels per side (9, 5 and 3 for km = 1 at 250 m, 500 m and 1 km).
  const n = 2 * Math.floor(km * 1000 / cellMeters) + 1;
  const sideKm = Number((n * cellMeters / 1000).toFixed(1));
  return { n, pixels: n * n, cellMeters: Math.round(cellMeters), sideKm, areaKm2: Number((sideKm * sideKm).toFixed(1)), pixelSharePct: Number((100 / (n * n)).toFixed(1)) };
}

/** Plain-language coverage for a point-subset result, so it is never read as a whole-area value. */
export function windowCoverageText(datasetId: string, township: boolean) {
  const product = SATELLITE_PRODUCTS[datasetId] ?? (datasetId === "land-cover" ? { scale: 500, metric: "land-cover" } : undefined);
  if (!product) return "";
  const w = subsetWindow(product.scale);
  const place = township ? "township representative point" : "regional reference point";
  const area = township ? "township" : "state/region";
  let text = `Calculated from a ${w.n} × ${w.n} window of ${w.cellMeters} m NASA MODIS pixels (${w.pixels} pixels, about ${w.sideKm} km × ${w.sideKm} km ≈ ${w.areaKm2} km²) around the ${place}. When every pixel is valid, each pixel is about ${w.pixelSharePct}% of the window, so values move in steps of about ${w.pixelSharePct}%. This is a window-based sample, not a ${area}-wide average; whole-boundary averages need the Google Earth Engine connection.`;
  if (product.metric === "burned") text += ` 0% means no burned pixels were detected in this window during that month; it does not mean the ${area} had no fires. Months NASA has not yet published are absent rather than shown as 0%.`;
  if (product.metric === "urban-ndvi" || product.metric === "urban-lst") text += " Only pixels mapped as urban/built-up by NASA MCD12Q1 are averaged, so a window with no mapped built-up pixels returns no value.";
  return text;
}
