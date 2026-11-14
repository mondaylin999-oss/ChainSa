import { afterEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { POST } from "@/app/api/explore/observations/route";
import { getTownshipPoint } from "@/features/explorer/township-location";
import { resetConfigForTests } from "@/features/earthlens-chat/server/env";
import { clearPowerCacheForTests } from "@/features/earthlens-chat/server/nasa/power";

afterEach(()=>{vi.unstubAllEnvs();vi.unstubAllGlobals();resetConfigForTests();clearPowerCacheForTests();});
const body={topicId:"agriculture",regionId:"yangon",datasetId:"rainfall",start:"2026-01-01",end:"2026-01-02",townshipId:"MMR013040"};
const request=(selection:unknown)=>new Request("http://localhost/api/explore/observations",{method:"POST",body:JSON.stringify(selection)});
describe("township observations",()=>{
 it("uses township coordinates and labels its response without claiming an area average",async()=>{
  const fetch=vi.fn(async(_url: RequestInfo | URL)=>Response.json({properties:{parameter:{PRECTOTCORR:{20260101:2,20260102:4}}},parameters:{PRECTOTCORR:{units:"mm/day"}}}));vi.stubGlobal("fetch",fetch);
  const response=await POST(request(body));const data=await response.json();const location=getTownshipPoint(body.townshipId,body.regionId)!;
  expect(response.status).toBe(200);expect(data.location).toMatchObject({id:body.townshipId,name:"Hlaing",type:"township",lat:location.lat,lon:location.lon});
  const url=new URL(String(fetch.mock.calls[0][0]));expect(Number(url.searchParams.get("latitude"))).toBeCloseTo(location.lat,4);expect(Number(url.searchParams.get("longitude"))).toBeCloseTo(location.lon,4);
  expect(data.geographicCoverage).toContain("not a township-wide average");expect(data.summary.mean).toBe(3);
 });
 it("rejects a township from another region before querying NASA",async()=>{
  const fetch=vi.fn();vi.stubGlobal("fetch",fetch);const response=await POST(request({...body,regionId:"shan"}));expect(response.status).toBe(400);expect(fetch).not.toHaveBeenCalled();
 });
 it("places every derived point inside its own township polygon",()=>{
  const boundaries=JSON.parse(readFileSync("public/township-boundaries.geojson","utf8"));
  const directory=JSON.parse(readFileSync("src/features/explorer/township-points.json","utf8"));
  const inside=(point:number[],rings:number[][][])=>{
   let contained=false;for(const ring of rings)for(let i=0,j=ring.length-1;i<ring.length;j=i++){
    const a=ring[i],b=ring[j];if((a[1]>point[1])!==(b[1]>point[1])&&point[0]<(b[0]-a[0])*(point[1]-a[1])/(b[1]-a[1])+a[0])contained=!contained;
   }return contained;
  };
  expect(directory.townships).toHaveLength(330);
  for(const township of directory.townships){const feature=boundaries.features.find((f:any)=>f.properties.TS_PCODE===township.id);const polygons=feature.geometry.type==="Polygon"?[feature.geometry.coordinates]:feature.geometry.coordinates;expect(polygons.some((polygon:number[][][])=>inside([township.lon,township.lat],polygon)),township.id).toBe(true);}
 });
});
