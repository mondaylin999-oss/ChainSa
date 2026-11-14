import type { DataSeries } from "../types/environmental";

export interface ChartPoint {
  date: string;
  value: number;
  quality?: string;
}

export function toChartPoints(series: DataSeries): ChartPoint[] {
  return [...series.observations]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map(({ date, value, quality }) => ({ date, value, quality }));
}
