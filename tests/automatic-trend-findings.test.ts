import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import TrendsPage from "../src/app/trends/page";
import { TrendFindingCard } from "../src/app/trends/NationwideTrends";
import { nationwideTrend } from "../src/app/trends/nationwide";
import { DATASETS } from "../src/features/explorer/catalog";
import type { ObservationResponse } from "../src/features/explorer/client/data-service";
const data:ObservationResponse={dataset:DATASETS.find(d=>d.id==="air-temperature")!,region:{id:"yangon",name:"Yangon",nameMy:"ရန်ကုန်",lat:17.11,lon:96.11},period:{start:"2021-01-01",end:"2025-12-31"},observations:[],summary:{count:0,mean:null,min:null,max:null,latest:null},source:{name:"NASA POWER",url:"https://power.larc.nasa.gov"},geographicCoverage:"Reference point",observedAt:"2026-11-15T00:00:00Z",missingCount:0};
describe("automatic trend findings",()=>{
 it("opens directly into findings without manual selection or date controls",()=>{
  const html=renderToStaticMarkup(createElement(TrendsPage));
  expect(html).not.toMatch(/<form|<select|type="date"/);
  expect(html).not.toContain("Analyze trends");
  expect(html).not.toContain("Refresh countrywide table");
  expect(html).toContain("five complete calendar years");
  expect(html).not.toContain("class=\"trend-finding\"");
 });
 it("never creates a significant card for unavailable or nonsignificant evidence",()=>{
  const analysis=nationwideTrend(data);
  for(const a of [analysis,{...analysis,available:true,pValue:.5}])expect(renderToStaticMarkup(createElement(TrendFindingCard,{lang:"en",data,analysis:a,onInspect:()=>{}}))).toBe("");
 });
 it("shows location, direction, rate, period and evidence access in English and Myanmar",()=>{
  const analysis={...nationwideTrend(data),available:true,pValue:.01,senSlope:.12,trendDirection:"increasing" as const,analysisPeriod:data.period};
  const en=renderToStaticMarkup(createElement(TrendFindingCard,{lang:"en",data,analysis,onInspect:()=>{}}));
  expect(en).toContain("Yangon");expect(en).toContain("Air temperature is increasing");expect(en).toContain("+0.1200");expect(en).toContain("2021-01-01");expect(en).toContain("View graph &amp; evidence");
  const my=renderToStaticMarkup(createElement(TrendFindingCard,{lang:"my",data,analysis,onInspect:()=>{}}));
  expect(my).toContain("ရန်ကုန်");expect(my).toContain("လေထုအပူချိန် တိုးလာသည်");expect(my).not.toContain("Air temperature is increasing");
 });
});
