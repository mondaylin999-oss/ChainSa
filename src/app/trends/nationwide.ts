import type { ObservationResponse } from "@/features/explorer/client/data-service";
import { calculateTemperatureSignificance } from "@/features/environmental/analysis/significance";

/** Reuse the existing inference rules; never infer significance from an endpoint change. */
export function nationwideTrend(data:ObservationResponse) {
 const observations=data.observations.filter(o=>o.value!==null&&Number.isFinite(o.value)).map(o=>({date:o.date,value:o.value!,unit:data.dataset.unit,source:data.source.name}));
 return calculateTemperatureSignificance({indicator:"temperature",datasetId:data.dataset.parameter==="T2M"?"NASA POWER T2M":data.dataset.id,dataset:data.dataset.label,temporalResolution:data.dataset.temporalResolution??"Daily",spatialResolution:data.geographicCoverage,observations,limitations:[data.dataset.limitations],requestedStartDate:data.period.start,requestedEndDate:data.period.end,expectedObservationCount:data.observations.length});
}
export function nationwideStatus(result:ReturnType<typeof nationwideTrend>) {
 if(!result.available||result.pValue===undefined||!Number.isFinite(result.pValue))return "unavailable";
 return result.pValue<.05?"significant":"not-significant";
}
export function nationalPeriod(today=new Date()) {const last=today.getUTCFullYear()-1;return {start:`${last-4}-01-01`,end:`${last}-12-31`};}
