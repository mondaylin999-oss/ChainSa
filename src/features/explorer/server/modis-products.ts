import "server-only";
import { TtlCache } from "@/features/earthlens-chat/server/cache";
import { SATELLITE_PRODUCTS, type SatelliteMetric } from "../satellite-products";

export const PUBLIC_MODIS_DATASETS = new Set(["forest-cover", "land-surface-temperature", "land-cover-change", "built-up-area", "settlement-expansion", "land-use-change", "evapotranspiration"]);
const BASE = "https://modis.ornl.gov/rst/api/v1";
interface Raster { calendar_date: string; modis_date: string; band: string; data: unknown[] }
interface Observation { date: string; value: number | null }
const dateCache = new TtlCache<{calendar_date:string;modis_date:string}[]>(12*3600000,150);
const resultCache = new TtlCache<Observation[]>(6*3600000,150);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

async function json(url: string, fetchImpl: typeof fetch) {
  const response = await fetchImpl(url,{signal:AbortSignal.timeout(45000),headers:{Accept:"application/json"},cache:"no-store"});
  if (!response.ok) throw new Error("NASA's satellite subset service is temporarily unavailable. Try again shortly.");
  return response.json() as Promise<unknown>;
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

export function publicModisValue(metric: SatelliteMetric, data: unknown[], quality: unknown[] = [], baseline: unknown[] = []): number | null {
  const values: number[] = [];
  for (let i=0;i<data.length;i++) {
    const raw=data[i], qa=quality[i], previous=baseline[i];
    if (typeof raw!=="number" || !Number.isFinite(raw)) continue;
    if (metric==="tree-cover") { if(raw>=0&&raw<=100) values.push(raw); }
    else if (metric==="lst") { if(raw>=7500&&raw<=65535&&typeof qa==="number"&&(qa&3)===0&&((qa>>6)&3)===0) values.push(raw*.02-273.15); }
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

export async function fetchPublicModis(datasetId:string,lat:number,lon:number,start:string,end:string,fetchImpl:typeof fetch=fetch) {
  const product=SATELLITE_PRODUCTS[datasetId];
  if(!product||!PUBLIC_MODIS_DATASETS.has(datasetId)) throw new Error("This product needs the site's Earth Engine connection.");
  const key=`${datasetId}:${lat.toFixed(4)},${lon.toFixed(4)}:${start}:${end}`;
  const hit=resultCache.get(key);if(hit)return hit;
  const name=product.collection.split("/").at(-1)!;
  const loc=`latitude=${lat.toFixed(4)}&longitude=${lon.toFixed(4)}`;
  const dateKey=`${name}:${loc}`;
  let all=dateCache.get(dateKey);
  if(!all) {
    all=parseDates(await json(`${BASE}/${name}/dates?${loc}`,fetchImpl));
    dateCache.set(dateKey,all!);
  }
  const dates=all!.filter(d=>d.calendar_date>=start&&d.calendar_date<=end).sort((a,b)=>a.calendar_date.localeCompare(b.calendar_date));
  if(dates.length>60)throw new Error("Choose a shorter range with at most 60 satellite observations.");
  const rasters:Raster[]=[];
  for(let i=0;i<dates.length;i+=10) {
    const batch=dates.slice(i,i+10);
    // Request all product bands together so science and quality pixels stay aligned.
    const payload=await json(`${BASE}/${name}/subset?${loc}&startDate=${batch[0].modis_date}&endDate=${batch.at(-1)!.modis_date}&kmAboveBelow=1&kmLeftRight=1`,fetchImpl);
    rasters.push(...parseRasters(payload));
  }
  const band=product.metric==="et"?"ET_500m":product.band;
  const qaBand=product.metric==="lst"?"QC_Day":"ET_QC_500m";
  if(dates.length&&!rasters.some(r=>r.band===band))throw new Error(`NASA did not include the expected ${band} band in its satellite response.`);
  if(dates.length&&(product.metric==="lst"||product.metric==="et")&&!rasters.some(r=>r.band===qaBand))throw new Error(`NASA did not include the expected ${qaBand} quality band in its satellite response.`);
  const baseline=rasters.find(r=>r.calendar_date===dates[0]?.calendar_date&&r.band===band)?.data;
  if(dates.length&&["land-change","built-change","crop-change"].includes(product.metric)&&!baseline?.length)throw new Error("NASA did not include the baseline land-cover pixels needed to calculate change.");
  const observations=dates.map(d=>{
    const row=rasters.find(r=>r.calendar_date===d.calendar_date&&r.band===band);
    const qa=rasters.find(r=>r.calendar_date===d.calendar_date&&r.band===qaBand)?.data??[];
    return{date:d.calendar_date,value:row?publicModisValue(product.metric,row.data,qa,baseline??[]):null};
  });
  resultCache.set(key,observations);return observations;
}
