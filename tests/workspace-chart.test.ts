import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { EnvironmentalChart } from "@/features/environmental/components/EnvironmentalChart";
import { chartText } from "@/features/environmental/components/chartCopy";
import { DATASETS } from "@/features/explorer/catalog";
import type { DataSeries } from "@/features/environmental/types/environmental";

const observations = [
  {date:"2025-01-01",value:0,unit:"°C",source:"NASA POWER"},
  {date:"2025-01-03",value:4,unit:"°C",source:"NASA POWER"},
];
const series:DataSeries={indicator:"temperature",dataset:"Near-surface air temperature",spatialResolution:"Reference point",temporalResolution:"Daily",observations,limitations:[]};

describe("workspace chart presentation",()=>{
  it("breaks the observed line at a missing reading while preserving genuine zero",()=>{
    const markup=renderToStaticMarkup(createElement(EnvironmentalChart,{series,locationName:"Yangon",startDate:"2025-01-01",endDate:"2025-01-03",observationTimeline:[observations[0],{date:"2025-01-02",value:null},observations[1]]}));
    const observedPath=markup.match(/<path d="([^"]+)" fill="none"/)!;
    expect(observedPath).toBeTruthy();
    expect(observedPath[1].match(/M/g)).toHaveLength(2);
    expect(observedPath[1]).not.toContain("L");
    expect(markup).toContain("Min 0.0000");
    expect(markup).toContain("2 valid observations");
    expect(observations.map(o=>o.value)).toEqual([0,4]);
  });
  it.each(DATASETS)("translates the actual chart title for $id",dataset=>{
    expect(chartText("my",dataset.label)).toMatch(/[\u1000-\u109f]/);
    expect(chartText("en",dataset.label)).toBe(dataset.label);
  });
});
