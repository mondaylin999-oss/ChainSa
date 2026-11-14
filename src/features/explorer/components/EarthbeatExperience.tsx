"use client";

import { useEffect, useMemo, useRef, useState, type PointerEvent, type KeyboardEvent } from "react";
import { EarthbeatEngine, earthbeatNearest, type EarthbeatState } from "@/features/earthbeat/core";
import { EnvironmentalChart } from "@/features/environmental/components/EnvironmentalChart";
import { DataTrendInsight } from "@/features/environmental/components/DataTrendInsight";
import { analyzeSeries } from "@/features/environmental/analysis/explainChanges";
import type { DataSeries } from "@/features/environmental/types/environmental";
import type { ObservationResponse } from "../client/data-service";

export function EarthbeatExperience({ result }: { result: ObservationResponse }) {
  const points = useMemo(() => result.observations.map(point => ({...point,time:Date.parse(point.date)})),[result]);
  const valid = useMemo(() => points.filter(point => point.value !== null),[points]);
  const [active,setActive] = useState(-1);
  const [state,setState] = useState<EarthbeatState>("paused");
  const [volume,setVolume] = useState(.15);
  const [speed,setSpeed] = useState(4);
  const [error,setError] = useState("");
  const engine = useRef<EarthbeatEngine | null>(null);
  const dragging = useRef(false);
  const lastIndex = useRef(-1);
  useEffect(() => {
    const player = new EarthbeatEngine(setActive,setState);
    player.load(points); engine.current=player; setActive(-1); setError("");
    const hidden = () => {if(document.hidden)player.pause();};
    document.addEventListener("visibilitychange",hidden);
    return () => {document.removeEventListener("visibilitychange",hidden);player.dispose();engine.current=null;};
  },[points]);
  useEffect(() => {engine.current?.setVolume(volume);engine.current?.setSpeed(speed);},[volume,speed,points]);
  const series: DataSeries = useMemo(() => ({
    indicator:result.dataset.parameter === "T2M" ? "temperature" : result.dataset.parameter === "PRECTOTCORR" ? "precipitation" : "environmental",
    dataset:result.dataset.label,datasetId:result.dataset.id === "fire-detections" ? "NASA_FIRMS" : "NASA_POWER",provider:result.source.name,
    spatialResolution:result.geographicCoverage,temporalResolution:"Daily",spatialSelection:result.dataset.id === "fire-detections" ? undefined : "representative-point",
    observations:valid.map(point=>({date:point.date,value:point.value!,unit:result.dataset.unit,source:result.source.name})),
    requestedStartDate:result.period.start,requestedEndDate:result.period.end,validObservationCount:valid.length,missingObservationCount:result.missingCount,
    limitations:[result.dataset.limitations,result.geographicCoverage],processing:["Missing observations are excluded from statistics and remain silent during playback.","Dates retain their elapsed-time spacing. Descriptive calculations are not forecasts."]
  }),[result,valid]);
  const analysis=useMemo(()=>analyzeSeries(series),[series]);
  function run(action:()=>Promise<void>|undefined){setError("");try{void action()?.catch(()=>setError("Audio could not start. Check your browser sound settings and try Play again."));}catch{setError("Sound is unavailable in this browser.");}}
  function select(index:number){if(index<0||points[index]?.value==null)return;setActive(index);run(()=>engine.current?.seek(index));}
  function toggle(){if(state==="playing")engine.current?.pause();else run(()=>engine.current?.play());}
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
    <EnvironmentalChart series={series} locationName={result.region.name} startDate={result.period.start} endDate={result.period.end} activeDate={current?.date} interactions={{role:"slider",tabIndex:0,"aria-label":"Interactive observation graph","aria-valuemin":0,"aria-valuemax":Math.max(0,points.length-1),"aria-valuenow":Math.max(0,active),"aria-valuetext":current?`${current.date}: ${current.value} ${result.dataset.unit}`:"No observation selected",onKeyDown:keyboard,onPointerDown:(event:PointerEvent<SVGSVGElement>)=>{if(event.pointerType==="mouse"&&event.button!==0)return;event.preventDefault();dragging.current=true;event.currentTarget.setPointerCapture(event.pointerId);event.currentTarget.focus();lastIndex.current=pointer(event);select(lastIndex.current);},onPointerMove:(event:PointerEvent<SVGSVGElement>)=>{const index=pointer(event);if(dragging.current&&index!==lastIndex.current){lastIndex.current=index;select(index);}},onPointerUp:()=>{dragging.current=false;},onPointerCancel:()=>{dragging.current=false;},onLostPointerCapture:()=>{dragging.current=false;}}}/>
    <div className="earthbeat-controls" aria-label="EARTHBEAT sound controls">
      <strong>EARTHBEAT · Graph ↔ sound</strong>
      <p aria-live={state==="playing"?"off":"polite"}>{current?`${current.date} · ${current.value} ${result.dataset.unit}`:"Touch the graph to hear a measurement."}</p>
      <div className="earthbeat-actions"><button className="button-primary" onClick={toggle} aria-pressed={state==="playing"}>{state==="playing"?"Stop":"Play"}</button><button className="button-secondary" onClick={()=>engine.current?.restart()}>Restart</button><span role="status">{state==="playing"?"Playing on repeat":"Paused"}</span></div>
      <div className="earthbeat-settings"><label>Volume<input aria-label="Sound volume" type="range" min="0" max="1" step=".01" value={volume} onChange={event=>setVolume(Number(event.target.value))}/></label><label>Speed<select value={speed} onChange={event=>setSpeed(Number(event.target.value))}>{[1,2,4,8].map(value=><option key={value} value={value}>{value}/s</option>)}</select></label></div>
      <p>Touch or drag the graph to audition a point. Arrow keys select points. Play repeats until Stop. Higher values have higher pitch (220–880 Hz); missing data is silent. Synthesized tones represent observations.</p>
      {error&&<p role="alert">{error}</p>}
    </div>
    <DataTrendInsight series={series} analysis={analysis} locationName={result.region.name} latitude={result.region.lat} longitude={result.region.lon}/>
  </div>;
}
