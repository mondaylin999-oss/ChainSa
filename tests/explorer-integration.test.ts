import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { EarthbeatExperience } from "@/features/explorer/components/EarthbeatExperience";
import type { ObservationResponse } from "@/features/explorer/client/data-service";
import { DATASETS } from "@/features/explorer/catalog";

const result: ObservationResponse = {
  dataset:DATASETS.find(dataset=>dataset.id==="air-temperature")!,
  region:{id:"yangon",name:"Yangon",nameMy:"ရန်ကုန်",lat:16.8,lon:96.1},
  period:{start:"2026-01-01",end:"2026-01-03"},
  observations:[{date:"2026-01-01",value:25},{date:"2026-01-02",value:null},{date:"2026-01-03",value:31}],
  summary:{count:2,mean:28,min:25,max:31,latest:31},
  source:{name:"NASA POWER",url:"https://power.larc.nasa.gov/"},geographicCoverage:"Regional reference point",observedAt:"2026-01-04T00:00:00Z",missingCount:1,
};
describe("contributor frontend and EARTHBEAT integration",()=>{
  it("renders the handover chart, accessible sound controls, and live source insights together",()=>{
    const markup=renderToStaticMarkup(createElement(EarthbeatExperience,{result}));
    expect(markup).toContain('aria-label="Interactive observation graph"');
    expect(markup).toContain("Data and Trend Insight");
    expect(markup).toContain("2 valid observations");
    expect(markup).toContain("NASA POWER");
    expect(markup).not.toContain("NASA LP DAAC / USGS EROS");
    expect(markup).not.toContain("NaN");
    expect(markup).toContain("Play repeats until Stop");
  });
});
