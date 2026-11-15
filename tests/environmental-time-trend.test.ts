import { describe, expect, it } from "vitest";
import { calculateStatistics } from "../src/features/environmental/processing/statistics";
import { buildDataTrendInsight } from "../src/features/environmental/analysis/dataTrendInsight";
import { analyzeSeries } from "../src/features/environmental/analysis/explainChanges";
import { chartText } from "../src/features/environmental/components/chartCopy";
import type { DataSeries } from "../src/features/environmental/types/environmental";
const series = (days:number[],values:number[]):DataSeries => ({indicator:"precipitation",dataset:"Rainfall",spatialResolution:"point",temporalResolution:"Daily",limitations:[],observations:days.map((day,i)=>({date:new Date(Date.UTC(2024,0,1)+day*86400000).toISOString().slice(0,10),value:values[i],unit:"mm/day",source:"NASA"}))});
describe("time-based descriptive trends",()=>{
 it("recognizes increasing and decreasing series with hundreds of observations",()=>{
  const days=Array.from({length:331},(_,i)=>i);
  for(const sign of [1,-1]){
   const data=series(days,days.map(day=>50+sign*day*.1));
   const stats=calculateStatistics(data), model=buildDataTrendInsight(data,analyzeSeries(data));
   expect(stats.trend).toBe(sign===1?"increasing":"decreasing");
   expect(stats.trendSlopePerYear).toBeCloseTo(sign*.1*365.2425,7);
   expect(model.trend.rate).toContain(stats.trendSlopePerYear!.toFixed(4));
   expect(stats.fittedTrendEnd!-stats.fittedTrendStart!).toBeCloseTo(sign*33,8);
  }
 });
 it("fits elapsed dates rather than observation indices",()=>{
  const stats=calculateStatistics(series([0,1,100],[0,1,100]));
  expect(stats.trendSlopePerYear).toBeCloseTo(365.2425,8);
  expect(stats.fittedTrendStart).toBeCloseTo(0,8);
  expect(stats.fittedTrendEnd).toBeCloseTo(100,8);
 });
 it("keeps endpoint change separate when the fitted direction is opposite",()=>{
  const data=series([0,1,2,3,4],[0,100,50,10,1]);
  const stats=calculateStatistics(data), model=buildDataTrendInsight(data,analyzeSeries(data));
  expect(stats.absoluteChange).toBe(1);
  expect(stats.trend).toBe("decreasing");
  expect(model.trend.rate.startsWith("-")).toBe(true);
  expect(stats.percentageChange).toBeUndefined();
 });
 it("handles flat and symmetric variable series without claiming a direction",()=>{
  expect(calculateStatistics(series([0,1,2],[2,2,2])).trend).toBe("stable");
  expect(calculateStatistics(series([0,1,2],[0,100,0])).trend).toBe("stable");
  expect(calculateStatistics(series([0,1,2],[0,100,.1])).trend).toBe("stable");
 });
 it("withholds the fit for insufficient or inconsistent observations",()=>{
  for(const data of [series([0],[1]),series([0,0],[1,2]),{...series([0,1],[1,2]),observations:[{date:"2024-02-30",value:1,unit:"mm/day",source:"NASA"},{date:"2024-03-01",value:2,unit:"mm/day",source:"NASA"}]}]){
   expect(calculateStatistics(data).trend).toBe("insufficient-data");
   expect(calculateStatistics(data).trendSlopePerYear).toBeUndefined();
  }
  const mixed=series([0,1],[1,2]);mixed.observations[1].unit="°C";
  expect(calculateStatistics(mixed).trend).toBe("insufficient-data");
 });
 it("translates the new fitted rate without changing its numeric value",()=>{
  const rate="12.3456 mm/day/year (time-based fit; descriptive only)";
  expect(chartText("my",rate)).not.toBe(rate);
  expect(chartText("my",rate)).toContain("12.3456");
 });
});
