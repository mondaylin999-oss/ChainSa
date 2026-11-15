import { useEffect, useId, useMemo, useRef, useState } from "react";
import styles from "./EnvironmentalChart.module.css";
import { chartText, type ChartLanguage } from "./chartCopy";
import type { DataSeries } from "../types/environmental";
import { toChartPoints, type ChartPoint } from "./chartModel";
import { calculateStatistics } from "../processing/statistics";

export interface EnvironmentalChartProps {
  lang?: ChartLanguage; observationTimeline?: ReadonlyArray<{ date: string; value: number | null }>;
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

export function EnvironmentalChart({ series, locationName, startDate, endDate, loading = false, error, activeDate, activeFraction, interactions, lang = "en", observationTimeline }: EnvironmentalChartProps) {
  const t = (text: string) => chartText(lang, text);
  const chartId = useId();
  const [hovered, setHovered] = useState<ChartPoint>();
  const points = useMemo(() => series ? toChartPoints(series) : [], [series]);
  const canvasRef = useRef<HTMLDivElement>(null);
  const [revealed, setRevealed] = useState(false);
  useEffect(() => {
    setRevealed(false);
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (!("IntersectionObserver" in window)) { setRevealed(true); return; }
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) {
        setRevealed(true);
        observer.disconnect();
      }
    }, { threshold: .15 });
    observer.observe(canvas);
    return () => observer.disconnect();
  }, [series, loading, error]);
  if (loading) return <section className="earthbeat-chart earthbeat-chart--state" aria-live="polite" lang={lang}>{t("Loading NASA observations…")}</section>;
  if (error) return <section className="earthbeat-chart earthbeat-chart--state" role="alert" lang={lang}>{t("Unable to load environmental data")}: {error}</section>;
  if (!series || points.length === 0) return <section className="earthbeat-chart earthbeat-chart--state" aria-live="polite" lang={lang}>{t("No valid observations for this location and date range.")}</section>;
  const values = points.map((point) => point.value);
  const statistics = calculateStatistics(series);
  const domain = calculateChartDomain(values, series.indicator)!; const yMin = domain.min; const yMax = domain.max;
  const width = 900; const height = 360; const left = 64; const right = 24; const top = 28; const bottom = 48;
  const plotWidth = width - left - right; const plotHeight = height - top - bottom;
  const xFor = (index: number) => left + (points.length === 1 ? plotWidth / 2 : ((Date.parse(points[index].date) - Date.parse(points[0].date)) / Math.max(1, Date.parse(points[points.length - 1].date) - Date.parse(points[0].date))) * plotWidth);
  const yFor = (value: number) => top + ((yMax - value) / (yMax - yMin)) * plotHeight;
  // Display gaps using the same median-interval rule as EARTHBEAT playback.
  // The statistical series stays unchanged; nulls are only used to split the drawing.
  const timeline = observationTimeline ?? points;
  const intervals = timeline.slice(1).map((point, index) => Date.parse(point.date) - Date.parse(timeline[index].date)).filter(gap => gap > 0).sort((a, b) => a - b);
  const gapLimit = intervals.length ? intervals[Math.floor(intervals.length / 2)] * 3 : Infinity;
  const missingTimes = timeline.filter(point => point.value === null).map(point => Date.parse(point.date));
  const segments: number[][] = [];
  points.forEach((point, index) => {
    const previousTime = index ? Date.parse(points[index - 1].date) : undefined;
    const time = Date.parse(point.date);
    const disconnected = previousTime === undefined || time - previousTime > gapLimit || missingTimes.some(missing => missing > previousTime && missing < time);
    if (disconnected) segments.push([]);
    segments[segments.length - 1].push(index);
  });
  const pathFor = (indices: number[]) => indices.map((index, position) => `${position === 0 ? "M" : "L"}${xFor(index).toFixed(2)},${yFor(points[index].value).toFixed(2)}`).join(" ");
  const linePath = segments.map(pathFor).join(" ");
  const meanY = statistics.mean === undefined ? undefined : yFor(statistics.mean);
  const slope = statistics.trendSlopePerObservation ?? 0;
  const trendStart = points.length > 1 ? statistics.mean! - slope * (points.length - 1) / 2 : undefined;
  const trendEnd = points.length > 1 ? statistics.mean! + slope * (points.length - 1) / 2 : undefined;
  const areaPath = segments.map(indices => `${pathFor(indices)} L${xFor(indices.at(-1)!)},${top + plotHeight} L${xFor(indices[0])},${top + plotHeight} Z`).join(" ");
  const activeIndex = activeDate ? points.findIndex((point) => point.date === activeDate) : -1;
  const activeX = activeFraction !== undefined ? left + Math.max(0, Math.min(1, activeFraction)) * plotWidth : activeIndex >= 0 ? xFor(activeIndex) : undefined;
  const minimumPoint = points.reduce((a, b) => b.value < a.value ? b : a);
  const maximumPoint = points.reduce((a, b) => b.value > a.value ? b : a);
  const ticks = [0, .25, .5, .75, 1].map((fraction) => yMin + (yMax - yMin) * (1 - fraction));
  const selected = (hovered && points.find(point => point.date === hovered.date)) || (activeIndex >= 0 ? points[activeIndex] : undefined);
  const unit = t(series.observations[0]?.unit ?? "Value");
  const title = `${t(series.dataset)} · ${locationName}`;
  return <section className="earthbeat-chart" lang={lang} aria-label={`${t(series.indicator)} · ${t("environmental chart")}`}>
    <header className="earthbeat-chart__header"><div><p className="earthbeat-chart__eyebrow">{t("NASA EARTH OBSERVATION")} · {t(series.indicator)}</p><h2>{t(series.dataset)}</h2><p>{locationName} · {t(`${startDate} to ${endDate}`)}</p></div><div className="earthbeat-chart__badge">{t(`${points.length} valid observations`)}</div></header>
    <div ref={canvasRef} className={`earthbeat-chart__canvas ${styles.canvas}`} data-revealed={revealed}><svg viewBox={`0 0 ${width} ${height}`} role="img" aria-labelledby={`${chartId}-title`} aria-describedby={`${chartId}-description`} {...interactions} onMouseMove={event => {
      const bounds = event.currentTarget.getBoundingClientRect();
      const fraction = Math.max(0, Math.min(1, ((event.clientX - bounds.left) / bounds.width * width - left) / plotWidth));
      const time = Date.parse(points[0].date) + fraction * (Date.parse(points.at(-1)!.date) - Date.parse(points[0].date));
      const nearest = points.reduce((best, point) => Math.abs(Date.parse(point.date) - time) < Math.abs(Date.parse(best.date) - time) ? point : best);
      setHovered(nearest);
    }} onMouseLeave={() => setHovered(undefined)}>
      <title id={`${chartId}-title`}>{title}</title>
      <desc id={`${chartId}-description`}>{t("Interactive observation graph")}. {t("Unit")}: {unit}. {t("Use Left/Right arrows, Home or End to select a reading; Enter or Space plays or pauses sound.")}</desc>
      <defs><linearGradient id={`${chartId}-area`} x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#55e6a5" stopOpacity=".42" /><stop offset="100%" stopColor="#55e6a5" stopOpacity=".02" /></linearGradient><clipPath id={`${chartId}-reveal`} clipPathUnits="userSpaceOnUse"><rect className={styles.revealWindow} x="0" y="0" width={width} height={height}/></clipPath></defs>
      <text x={left} y={16} fill="#668078" fontSize="12">{t("Unit")}: {unit}</text>
      {ticks.map((tick) => <g key={tick}><line x1={left} x2={width - right} y1={yFor(tick)} y2={yFor(tick)} stroke="#dce8e3" strokeDasharray="4 8" /><text x={left - 12} y={yFor(tick) + 4} textAnchor="end" fill="#668078" fontSize="12">{tick.toFixed(2)}</text></g>)}
      <g clipPath={`url(#${chartId}-reveal)`}>
      <path d={areaPath} fill={`url(#${chartId}-area)`} /><path d={linePath} fill="none" stroke={series.indicator === "temperature" ? "#e67e22" : series.indicator === "precipitation" ? "#2980b9" : "#15946a"} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
      {meanY !== undefined && <line x1={left} x2={width - right} y1={meanY} y2={meanY} stroke="#64748b" strokeWidth="2" strokeDasharray="7 5" />}
      {trendStart !== undefined && trendEnd !== undefined && <line x1={xFor(0)} x2={xFor(points.length - 1)} y1={yFor(trendStart)} y2={yFor(trendEnd)} stroke="#d14d72" strokeWidth="2" strokeDasharray="3 5" />}
      {points.length <= 240 && points.map((point, index) => <circle key={point.date} cx={xFor(index)} cy={yFor(point.value)} r={hovered?.date === point.date ? 7 : 3.5} fill={point.quality === "marginal" ? "#f2a93b" : "#15946a"} stroke="#fff" strokeWidth="2" onMouseEnter={() => setHovered(point)}><title>{`${point.date}: ${point.value.toFixed(4)} ${unit} · ${t(point.quality ?? "processed observation")}`}</title></circle>)}
      </g>
      {activeX !== undefined && <line x1={activeX} x2={activeX} y1={top} y2={top + plotHeight} stroke="#e15b48" strokeWidth="2" strokeDasharray="5 5" />}
      <text x={left} y={height - 12} fill="#668078" fontSize="12">{points[0].date}</text><text x={width - right} y={height - 12} textAnchor="end" fill="#668078" fontSize="12">{points[points.length - 1].date}</text>
    </svg>{selected && <div className="earthbeat-chart__tooltip" role="status"><strong>{selected.date}</strong><br />{t(series.indicator)}: {selected.value.toFixed(4)} {unit}<br /><small>{t(selected.quality ?? "processed observation")}</small></div>}</div>
    <footer className="earthbeat-chart__footer"><span><i style={{color: series.indicator === "temperature" ? "#e67e22" : series.indicator === "precipitation" ? "#2980b9" : "#15946a"}}>●</i> {t("Observations")}</span><span><i style={{color: "#64748b"}}>━</i> {t("Mean reference")}</span><span><i style={{color: "#d14d72"}}>┅</i> {t("Descriptive trend")}</span>{points.some(point => point.quality === "marginal") && <span><i style={{color: "#f2a93b"}}>●</i> {t("Marginal quality")}</span>}<span>{t("Min")} {minimumPoint.value.toFixed(4)} · {minimumPoint.date}</span><span>{t("Max")} {maximumPoint.value.toFixed(4)} · {maximumPoint.date}</span><span>{unit}</span></footer>
    <p>{t("Lines break at missing readings and gaps over three times the median observation interval. Reference lines summarize valid readings only.")}</p>
    <style>{`.earthbeat-chart{font-family:Inter,ui-sans-serif,system-ui,sans-serif;background:#f7fbf9;border:1px solid #dce8e3;border-radius:24px;padding:24px;color:#163d32;box-shadow:0 18px 50px rgba(16,73,55,.08)}.earthbeat-chart--state{min-height:160px;display:grid;place-items:center}.earthbeat-chart__header{display:flex;justify-content:space-between;gap:20px;align-items:flex-start}.earthbeat-chart__eyebrow{font-size:11px;letter-spacing:.14em;font-weight:700;color:#15946a;margin:0 0 8px}.earthbeat-chart h2{font-size:20px;margin:0 0 6px}.earthbeat-chart p{margin:0;color:#668078}.earthbeat-chart__badge{background:#e3f6ed;color:#087a55;border-radius:999px;padding:8px 12px;font-size:12px;font-weight:700;white-space:nowrap}.earthbeat-chart__canvas{position:relative;margin-top:20px;overflow:hidden}.earthbeat-chart svg{display:block;width:100%;height:auto}.earthbeat-chart__tooltip{position:absolute;right:20px;top:16px;background:#163d32;color:#fff;border-radius:12px;padding:10px 13px;font-size:13px;line-height:1.45;box-shadow:0 10px 25px rgba(0,0,0,.14)}.earthbeat-chart__tooltip small{color:#bcebd7;text-transform:capitalize}.earthbeat-chart__footer{display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-top:14px;color:#668078;font-size:12px}@media(max-width:640px){.earthbeat-chart{padding:16px;border-radius:18px}.earthbeat-chart__header{display:block}.earthbeat-chart__badge{display:inline-block;margin-top:12px}}`}</style>
  </section>;
}
