"use client";

import { useEffect, useMemo, useRef, useState, type PointerEvent, type KeyboardEvent } from "react";
import { Volume2, VolumeX } from "lucide-react";
import { EarthbeatEngine, earthbeatNearest, type EarthbeatState } from "@/features/earthbeat/core";
import { EnvironmentalChart } from "@/features/environmental/components/EnvironmentalChart";
import { DataTrendInsight } from "@/features/environmental/components/DataTrendInsight";
import { analyzeSeries } from "@/features/environmental/analysis/explainChanges";
import type { DataSeries } from "@/features/environmental/types/environmental";
import type { ObservationResponse } from "../client/data-service";
import { readVolume, VOLUME_EVENT } from "@/features/earthbeat/volume";

export function EarthbeatExperience({ result }: { result: ObservationResponse }) {
  const location=result.location ?? result.region;
  const points = useMemo(() => result.observations.map(point => ({...point,time:Date.parse(point.date)})),[result]);
  const valid = useMemo(() => points.filter(point => point.value !== null),[points]);
  const [active,setActive] = useState(-1);
  const [state,setState] = useState<EarthbeatState>("paused");
  const [playhead, setPlayhead] = useState<number>();
  const [starting, setStarting] = useState(false);
  const [error,setError] = useState("");
  const engine = useRef<EarthbeatEngine | null>(null);
  const dragging = useRef(false);
  const lastIndex = useRef(-1);
  useEffect(() => {
    const player = new EarthbeatEngine((index, _point, fraction) => { setActive(index); setPlayhead(fraction === undefined || !valid.length ? undefined : (points[0].time + fraction * (points.at(-1)!.time - points[0].time) - valid[0].time) / Math.max(1, valid.at(-1)!.time - valid[0].time)); },setState);
    player.load(points); engine.current=player; setActive(-1); setPlayhead(undefined); setError("");
    player.setVolume(readVolume());
    const volumeChanged = (event: Event) => player.setVolume(event instanceof CustomEvent ? event.detail : readVolume());
    window.addEventListener(VOLUME_EVENT, volumeChanged); window.addEventListener("storage", volumeChanged);
    const hidden = () => {if(document.hidden)player.pause();};
    document.addEventListener("visibilitychange",hidden);
    return () => {window.removeEventListener(VOLUME_EVENT,volumeChanged);window.removeEventListener("storage",volumeChanged);document.removeEventListener("visibilitychange",hidden);player.dispose();engine.current=null;};
  },[points]);
  const series: DataSeries = useMemo(() => ({
    indicator:result.dataset.parameter === "T2M" ? "temperature" : result.dataset.parameter === "PRECTOTCORR" ? "precipitation" : /vegetation/.test(result.dataset.id) ? "ndvi" : "environmental",
    dataset:result.dataset.label,datasetId:result.dataset.parameter === "T2M" ? "NASA POWER T2M" : result.dataset.engine === "earth-engine" ? result.source.name.split(" via ")[0] : result.dataset.id === "fire-detections" ? "NASA_FIRMS" : result.dataset.temporalResolution ? "NASA_MODIS" : "NASA_POWER",provider:result.source.name,
    measurement:{name:result.dataset.label,code:result.dataset.id,what:result.dataset.description,unit:result.dataset.unit,meaning:`Values are reported in ${result.dataset.unit}. Monthly summaries describe available observations; they are not accumulated totals or forecasts.`,caution:result.dataset.limitations},
    spatialResolution:result.geographicCoverage,temporalResolution:result.dataset.temporalResolution ?? "Daily",spatialSelection:result.spatialSelection ?? (result.dataset.id === "fire-detections" ? undefined : "representative-point"),qaPolicy:result.qaPolicy,
    observations:valid.map(point=>({date:point.date,value:point.value!,unit:result.dataset.unit,source:result.source.name})),
    requestedStartDate:result.period.start,requestedEndDate:result.period.end,validObservationCount:valid.length,missingObservationCount:result.missingCount,expectedObservationCount:points.length,coverageFraction:points.length?valid.length/points.length:0,actualStartDate:valid[0]?.date,actualEndDate:valid.at(-1)?.date,
    limitations:[result.dataset.limitations,result.geographicCoverage],processing:["Missing observations are excluded from statistics and remain silent during playback.","Dates retain their elapsed-time spacing. Descriptive calculations are not forecasts."]
  }),[result,valid,points]);
  const analysis=useMemo(()=>analyzeSeries(series),[series]);
  function run(action:()=>Promise<void>|undefined){setError("");try{void action()?.catch(()=>setError("Audio could not start. Check your browser sound settings and try the speaker button again."));}catch{setError("Sound is unavailable in this browser.");}}
  function select(index:number){if(index<0||points[index]?.value==null)return;setActive(index);run(()=>engine.current?.seek(index));}
  async function toggle() {
    if (starting) return;
    if (state === "playing") { engine.current?.pause(); return; }
    setStarting(true); setError("");
    try { await engine.current?.play(); }
    catch { setError("Audio could not start. Check your browser sound settings and try the speaker button again."); }
    finally { setStarting(false); }
  }
  function pointer(event:PointerEvent<SVGSVGElement>){
    if(!valid.length)return -1;
    const bounds=event.currentTarget.getBoundingClientRect();
    const fraction=Math.max(0,Math.min(1,((event.clientX-bounds.left)/bounds.width*900-64)/812));
    const time=valid[0].time+fraction*(valid.at(-1)!.time-valid[0].time);
    return earthbeatNearest(points,(time-points[0].time)/Math.max(1,points.at(-1)!.time-points[0].time));
  }
  function keyboard(event:KeyboardEvent<SVGSVGElement>){
    const indices=points.flatMap((point,index)=>point.value===null?[]:[index]);const position=Math.max(0,indices.indexOf(active));
    const index=event.key==="ArrowRight"?indices[Math.min(indices.length-1,position+1)]:event.key==="ArrowLeft"?indices[Math.max(0,position-1)]:event.key==="Home"?indices[0]:event.key==="End"?indices.at(-1):undefined;
    if(index!==undefined){event.preventDefault();select(index);}if(event.key===" "||event.key==="Enter"){event.preventDefault();toggle();}
  }
  const current=points[active];
  return <div className="earthbeat-experience">
    <EnvironmentalChart series={series} locationName={location.name} startDate={result.period.start} endDate={result.period.end} activeDate={current?.date} activeFraction={playhead} interactions={{role:"slider",tabIndex:0,"aria-label":"Interactive observation graph","aria-valuemin":0,"aria-valuemax":Math.max(0,points.length-1),"aria-valuenow":Math.max(0,active),"aria-valuetext":current?`${current.date}: ${current.value} ${result.dataset.unit}`:"No observation selected",onKeyDown:keyboard,onPointerDown:(event:PointerEvent<SVGSVGElement>)=>{if(event.pointerType==="mouse"&&event.button!==0)return;event.preventDefault();dragging.current=true;event.currentTarget.setPointerCapture(event.pointerId);event.currentTarget.focus();lastIndex.current=pointer(event);select(lastIndex.current);},onPointerMove:(event:PointerEvent<SVGSVGElement>)=>{const index=pointer(event);if(dragging.current&&index!==lastIndex.current){lastIndex.current=index;select(index);}},onPointerUp:()=>{dragging.current=false;},onPointerCancel:()=>{dragging.current=false;},onLostPointerCapture:()=>{dragging.current=false;}}}/>
    <div className="earthbeat-controls" aria-label="EARTHBEAT sound controls">
      <div className="earthbeat-player-heading">
        <div><strong>EARTHBEAT</strong><p>{location.name} · {result.dataset.label} · {result.period.start} — {result.period.end}</p></div>
        <button type="button" className="earthbeat-speaker button-primary" onClick={() => void toggle()} disabled={!valid.length || starting} aria-pressed={state === "playing"} aria-label={state === "playing" ? "Stop EARTHBEAT sound" : "Play EARTHBEAT sound"} title={state === "playing" ? "Stop EARTHBEAT sound" : "Play EARTHBEAT sound"}>
          {state === "playing" ? <Volume2 size={22} aria-hidden="true" /> : <VolumeX size={22} aria-hidden="true" />}
        </button>
      </div>
      <p aria-live={state === "playing" ? "off" : "polite"}>{current ? `${current.date} · ${current.value === null ? "No reading" : `${current.value} ${result.dataset.unit}`}` : "Click the speaker to hear this graph."}</p>
      <p>Sound follows the graph smoothly and repeats every 24 seconds until stopped. Missing readings and long gaps are silent.</p>
      {error && <p role="alert">{error}</p>}
    </div>
    <DataTrendInsight series={series} analysis={analysis} locationName={location.name} latitude={location.lat} longitude={location.lon}/>
  </div>;
}
