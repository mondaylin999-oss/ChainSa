import { it, expect } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { GraphExplanation } from "../src/features/explorer/components/GraphExplanation";
import { DATASETS } from "../src/features/explorer/catalog";
import type { ObservationResponse } from "../src/features/explorer/client/data-service";
const result:ObservationResponse={dataset:DATASETS.find(d=>d.id==="rainfall")!,region:{id:"yangon",name:"Yangon",nameMy:"ရန်ကုန်",lat:16.8,lon:96.1},period:{start:"2025-01-01",end:"2025-01-03"},observations:[{date:"2025-01-01",value:0},{date:"2025-01-02",value:null},{date:"2025-01-03",value:10}],summary:{count:2,mean:5,min:0,max:10,latest:10},source:{name:"NASA POWER",url:"https://power.larc.nasa.gov"},geographicCoverage:"Point",observedAt:"2025-01-04",missingCount:1};
it("explains readings without counting missing values as zero or claiming complete coverage",()=>{
 const html=renderToStaticMarkup(createElement(GraphExplanation,{result,lang:"en"}));
 expect(html).toContain('5');expect(html).toContain('2 / 3');expect(html).toContain('2025-01-03');expect(html).toContain('not the total rainfall');expect(html).toContain('does not guarantee');expect(html).toContain('The lowest valid reading');
});
it("provides Myanmar explanations and handles empty series without invented statistics",()=>{
 const html=renderToStaticMarkup(createElement(GraphExplanation,{result:{...result,observations:[]},lang:"my"}));
 expect(html).toContain('အကျဉ်းချုပ်ရန် မှန်ကန်သော တိုင်းတာချက် မရရှိပါ');expect(html).not.toContain('What this graph shows');
});
