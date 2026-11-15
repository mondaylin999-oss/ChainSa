import { useMemo, useState } from "react";
import type { DataSeries } from "../types/environmental";
import { toChartPoints, type ChartPoint } from "./chartModel";
import { calculateStatistics } from "../processing/statistics";

export interface EnvironmentalChartProps {
  series?: DataSeries; locationName: string; startDate: string; endDate: string;
  loading?: boolean; error?: string; activeDate?: string; activeFraction?: number; interactions?: Record<string, unknown>;
}

// Adapted from the supplied handover; recomputed from each selected location's series.
export function calculateChartDomain(values: number[], indicator: DataSeries["indicator"]): { min: number; max: number } | undefined {
  if (!values.length || values.some(value => !Number.isFinite(value))) return undefined;
  const low = Math.min(...values), high = Math.max(...values);
  const pad = Math.max((high - low) * .12, Math.abs(high || low || 1) * .02, .02);
  return { min: indicator === "ndvi" ? Math.min(low - pad, -1) : low - pad, max: indicator === "ndvi" ? Math.max(high + pad, 1) : high + pad };
}

export function EnvironmentalChart({ series, locationName, startDate, endDate, loading = false, error, activeDate, activeFraction, interactions }: EnvironmentalChartProps) {
  const [hovered, setHovered] = useState<ChartPoint>();
  const points = useMemo(() => series ? toChartPoints(series) : [], [series]);
  if (loading) return <section className="earthbeat-chart earthbeat-chart--state" aria-live="polite">Loading NASA observations…</section>;
  if (error) return <section className="earthbeat-chart earthbeat-chart--state" role="alert">Unable to load environmental data: {error}</section>;
  if (!series || points.length === 0) return <section className="earthbeat-chart earthbeat-chart--state" aria-live="polite">No valid observations for this location and date range.</section>;
  const values = points.map((point) => point.value);
  const statistics = calculateStatistics(series);
  const domain = calculateChartDomain(values, series.indicator)!; const yMin = domain.min; const yMax = domain.max;
  const width = 900; const height = 360; const left = 64; const right = 24; const top = 28; const bottom = 48;
  const plotWidth = width - left - right; const plotHeight = height - top - bottom;
  const xFor = (index: number) => left + (points.length === 1 ? plotWidth / 2 : ((Date.parse(points[index].date) - Date.parse(points[0].date)) / Math.max(1, Date.parse(points[points.length - 1].date) - Date.parse(points[0].date))) * plotWidth);
  const yFor = (value: number) => top + ((yMax - value) / (yMax - yMin)) * plotHeight;
  const linePath = points.map((point, index) => `${index === 0 ? "M" : "L"}${xFor(index).toFixed(2)},${yFor(point.value).toFixed(2)}`).join(" ");
  const meanY = statistics.mean === undefined ? undefined : yFor(statistics.mean);
  const slope = statistics.trendSlopePerObservation ?? 0;
  const trendStart = points.length > 1 ? statistics.mean! - slope * (points.length - 1) / 2 : undefined;
  const trendEnd = points.length > 1 ? statistics.mean! + slope * (points.length - 1) / 2 : undefined;
  const areaPath = `${linePath} L${xFor(points.length - 1)},${top + plotHeight} L${xFor(0)},${top + plotHeight} Z`;
  const activeIndex = activeDate ? points.findIndex((point) => point.date === activeDate) : -1;
  const activeX = activeFraction !== undefined ? left + Math.max(0, Math.min(1, activeFraction)) * plotWidth : activeIndex >= 0 ? xFor(activeIndex) : undefined;
  const minimumPoint = points.reduce((a, b) => b.value < a.value ? b : a);
  const maximumPoint = points.reduce((a, b) => b.value > a.value ? b : a);
  const ticks = [0, .25, .5, .75, 1].map((fraction) => yMin + (yMax - yMin) * (1 - fraction));
  return <section className="earthbeat-chart" aria-label={`${series.indicator} environmental chart`}>
    <header className="earthbeat-chart__header"><div><p className="earthbeat-chart__eyebrow">NASA EARTH OBSERVATION · {series.indicator.toUpperCase()}</p><h2>{series.dataset}</h2><p>{locationName} · {startDate} to {endDate}</p></div><div className="earthbeat-chart__badge">{points.length} valid observations</div></header>
    <div className="earthbeat-chart__canvas"><svg viewBox={`0 0 ${width} ${height}`} {...interactions} onMouseLeave={() => setHovered(undefined)}>
      <defs><linearGradient id="ndvi-area" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#55e6a5" stopOpacity=".42" /><stop offset="100%" stopColor="#55e6a5" stopOpacity=".02" /></linearGradient></defs>
      {ticks.map((tick) => <g key={tick}><line x1={left} x2={width - right} y1={yFor(tick)} y2={yFor(tick)} stroke="#dce8e3" strokeDasharray="4 8" /><text x={left - 12} y={yFor(tick) + 4} textAnchor="end" fill="#668078" fontSize="12">{tick.toFixed(2)}</text></g>)}
      <path d={areaPath} fill="url(#ndvi-area)" /><path d={linePath} fill="none" stroke={series.indicator === "temperature" ? "#e67e22" : series.indicator === "precipitation" ? "#2980b9" : "#15946a"} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
      {meanY !== undefined && <line x1={left} x2={width - right} y1={meanY} y2={meanY} stroke="#64748b" strokeWidth="2" strokeDasharray="7 5" />}
      {trendStart !== undefined && trendEnd !== undefined && <line x1={xFor(0)} x2={xFor(points.length - 1)} y1={yFor(trendStart)} y2={yFor(trendEnd)} stroke="#d14d72" strokeWidth="2" strokeDasharray="3 5" />}
      {points.length <= 240 && points.map((point, index) => <circle key={point.date} cx={xFor(index)} cy={yFor(point.value)} r={hovered?.date === point.date ? 7 : 3.5} fill={point.quality === "marginal" ? "#f2a93b" : "#15946a"} stroke="#fff" strokeWidth="2" onMouseEnter={() => setHovered(point)} />)}
      {activeX !== undefined && <line x1={activeX} x2={activeX} y1={top} y2={top + plotHeight} stroke="#e15b48" strokeWidth="2" strokeDasharray="5 5" />}
      <text x={left} y={height - 12} fill="#668078" fontSize="12">{points[0].date}</text><text x={width - right} y={height - 12} textAnchor="end" fill="#668078" fontSize="12">{points[points.length - 1].date}</text>
    </svg>{hovered && <div className="earthbeat-chart__tooltip" role="status"><strong>{hovered.date}</strong><br />{series.indicator.toUpperCase()}: {hovered.value.toFixed(4)} {series.observations[0]?.unit ?? ""}<br /><small>{hovered.quality ?? "processed observation"}</small></div>}</div>
    <footer className="earthbeat-chart__footer"><span><i style={{color: series.indicator === "temperature" ? "#e67e22" : series.indicator === "precipitation" ? "#2980b9" : "#15946a"}}>●</i> Observations</span><span><i style={{color: "#64748b"}}>━</i> Mean reference</span><span><i style={{color: "#d14d72"}}>┅</i> Descriptive trend</span>{points.some(point => point.quality === "marginal") && <span><i style={{color: "#f2a93b"}}>●</i> Marginal quality</span>}<span>Min {minimumPoint.value.toFixed(4)} · {minimumPoint.date}</span><span>Max {maximumPoint.value.toFixed(4)} · {maximumPoint.date}</span><span>{series.observations[0]?.unit ?? "Value"}</span></footer>
    <style>{`.earthbeat-chart{font-family:Inter,ui-sans-serif,system-ui,sans-serif;background:#f7fbf9;border:1px solid #dce8e3;border-radius:24px;padding:24px;color:#163d32;box-shadow:0 18px 50px rgba(16,73,55,.08)}.earthbeat-chart--state{min-height:160px;display:grid;place-items:center}.earthbeat-chart__header{display:flex;justify-content:space-between;gap:20px;align-items:flex-start}.earthbeat-chart__eyebrow{font-size:11px;letter-spacing:.14em;font-weight:700;color:#15946a;margin:0 0 8px}.earthbeat-chart h2{font-size:20px;margin:0 0 6px}.earthbeat-chart p{margin:0;color:#668078}.earthbeat-chart__badge{background:#e3f6ed;color:#087a55;border-radius:999px;padding:8px 12px;font-size:12px;font-weight:700;white-space:nowrap}.earthbeat-chart__canvas{position:relative;margin-top:20px;overflow:hidden}.earthbeat-chart svg{display:block;width:100%;height:auto}.earthbeat-chart__tooltip{position:absolute;right:20px;top:16px;background:#163d32;color:#fff;border-radius:12px;padding:10px 13px;font-size:13px;line-height:1.45;box-shadow:0 10px 25px rgba(0,0,0,.14)}.earthbeat-chart__tooltip small{color:#bcebd7;text-transform:capitalize}.earthbeat-chart__footer{display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-top:14px;color:#668078;font-size:12px}@media(max-width:640px){.earthbeat-chart{padding:16px;border-radius:18px}.earthbeat-chart__header{display:block}.earthbeat-chart__badge{display:inline-block;margin-top:12px}}`}</style>
  </section>;
}
