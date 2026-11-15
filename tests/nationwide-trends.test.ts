import {describe,it,expect} from "vitest";
import {nationalPeriod,nationwideStatus,nationwideTrend} from "@/app/trends/nationwide";
import {DATASETS} from "@/features/explorer/catalog";
import type {ObservationResponse} from "@/features/explorer/client/data-service";
const data:ObservationResponse={dataset:DATASETS.find(d=>d.id==="air-temperature")!,region:{id:"yangon",name:"Yangon",nameMy:"ရန်ကုန်",lat:17.11,lon:96.11},period:{start:"2025-01-01",end:"2025-01-03"},observations:[{date:"2025-01-01",value:0},{date:"2025-01-02",value:null},{date:"2025-01-03",value:4}],summary:{count:2,mean:2,min:0,max:4,latest:4},source:{name:"NASA POWER",url:"https://power.larc.nasa.gov"},geographicCoverage:"Reference point",observedAt:"2025-01-04T00:00:00Z",missingCount:1};
describe("nationwide trend evidence",()=>{
 it("uses the latest five complete UTC calendar years",()=>expect(nationalPeriod(new Date("2026-11-15T00:00:00Z"))).toEqual({start:"2021-01-01",end:"2025-12-31"}));
 it("retains a genuine zero, excludes missing values, and withholds inference on short records",()=>{const a=nationwideTrend(data);expect(a.validObservationCount).toBe(2);expect(a.expectedObservationCount).toBe(3);expect(a.available).toBe(false);expect(nationwideStatus(a)).toBe("unavailable");expect(data.observations[0].value).toBe(0)});
 it("never labels a withheld or invalid p-value as significant or not significant",()=>{const a=nationwideTrend(data);expect(nationwideStatus({...a,pValue:.001})).toBe("unavailable");expect(nationwideStatus({...a,available:true,pValue:NaN})).toBe("unavailable");expect(nationwideStatus({...a,available:true,pValue:undefined})).toBe("unavailable")});
 it("keeps the existing strict p < 0.05 rule",()=>{const a=nationwideTrend(data);expect(nationwideStatus({...a,available:true,pValue:.049})).toBe("significant");expect(nationwideStatus({...a,available:true,pValue:.05})).toBe("not-significant");expect(nationwideStatus({...a,available:true,pValue:1})).toBe("not-significant")});
});
