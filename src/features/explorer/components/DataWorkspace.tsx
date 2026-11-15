"use client";

import { useEffect, useState, type ReactNode } from "react";
import { ArrowRight, Check, ChevronLeft, ChevronRight, ChevronDown, Search, MapPin, Sprout, TriangleAlert, Leaf, Building2, Droplets, Zap, LoaderCircle, Info, ExternalLink, ChartNoAxesCombined } from "lucide-react";
import { TOPICS, type TopicId, type TopicIndicator } from "../catalog";
import { REGIONS } from "../../earthlens-chat/regions";
import type { ExploreCatalog, ObservationResponse, ObservationSelection } from "../client/data-service";
import { categoryName, indicatorName, indicatorDescription, spatialBasisName, workspaceError } from "../workspace-copy";
import { selectionError } from "../workspace-selection";
import { MyanmarMap } from "./MyanmarMap";
import "./data-workspace.css";

export interface DataWorkspaceProps {
 lang:"en"|"my"; catalog:ExploreCatalog|null; catalogError:string; activeTopic:TopicId; openTopic:TopicId|null; datasetId:string; regionId:string; townshipId:string; locationMode:"township"|"reference"; start:string; end:string; mapFocused:boolean; dirty:boolean; loading:boolean; error:string; result:ObservationResponse|null; chart:ReactNode; details:ReactNode;
 onTopic:(id:TopicId)=>void;onIndicator:(indicator:TopicIndicator)=>void;onDataset:(id:string)=>void;onRegion:(id:string)=>void;onTownship:(id:string)=>void;onLocationMode:(mode:"township"|"reference")=>void;onStart:(s:string)=>void;onEnd:(s:string)=>void;onApply:()=>void;onMapFocus:(b:boolean)=>void;
}
const icons={agriculture:Sprout,"disaster-intelligence":TriangleAlert,"environmental-change":Leaf,"infrastructure-urban-change":Building2,water:Droplets,energy:Zap};
const today=()=>new Date().toISOString().slice(0,10);
const iso=(s?:string)=>Boolean(s&&/^\d{4}-\d{2}-\d{2}$/.test(s));

export function DataWorkspace(p:DataWorkspaceProps) {
 const {lang,catalog,result}=p;
 const t=(en:string,my:string)=>lang==="my"?my:en;
 const [query,setQuery]=useState("");
 const [navigationOpen,setNavigationOpen]=useState(true);
 const [controlsOpen,setControlsOpen]=useState(true);
 useEffect(()=>{if(window.innerWidth<760){setNavigationOpen(false);setControlsOpen(false);}},[]);
 const ds=catalog?.datasets.find(d=>d.id===p.datasetId);
 const region=REGIONS.find(r=>r.id===p.regionId);
 const township=catalog?.townships.find(d=>d.id===p.townshipId);
 const regionName=region?(lang==="my"?region.nameMy:region.name):"";
 const place=township?(lang==="my"?township.nameMy:township.name):regionName;
 const label=(id:string,fallback:string)=>indicatorName(id,fallback,lang);
 const selectedIndicator=TOPICS.flatMap(topic=>topic.indicators).find(i=>i.datasetId===p.datasetId);
 const title=label(p.datasetId,selectedIndicator?.label??ds?.label??t("Choose an indicator","ညွှန်ကိန်းရွေးပါ"));
 const dateMin=p.datasetId==="fire-detections"?new Date(Date.parse(today())-6*86400000).toISOString().slice(0,10):iso(ds?.coverage?.start)?ds!.coverage!.start:"1981-01-01";
 const dateMax=ds?.coverage&&!ds.coverage.ongoing&&iso(ds.coverage.end)?(ds.coverage.end<today()?ds.coverage.end:today()):today();
 const selection:ObservationSelection={topicId:p.activeTopic,regionId:p.regionId,townshipId:p.townshipId||undefined,datasetId:p.datasetId,start:p.start,end:p.end};
 const validation=selectionError(selection,ds,p.locationMode);
 const valid=result?.observations.filter(o=>o.value!==null&&Number.isFinite(o.value)).sort((a,b)=>a.date.localeCompare(b.date))??[];
 const latest=valid.at(-1);
 const actual=valid.length?`${valid[0].date} — ${latest!.date}`:t("No valid observations","မှန်ကန်သော တိုင်းတာချက် မရှိပါ");
 const count=catalog?.datasets.length??TOPICS.flatMap(topic=>topic.indicators).length;
 function status(id:string){const d=catalog?.datasets.find(x=>x.id===id);return !d?t("Loading","ရယူနေသည်"):d.available?t("Available","ရရှိနိုင်သည်"):d.setupRequired?t("Setup required","ချိတ်ဆက်ရန်လိုသည်"):t("Unavailable","မရရှိနိုင်ပါ");}
 return <div className="workspace-shell">
  <header className="workspace-heading"><div><p className="workspace-eyebrow">{t("MYANMAR • EARTH OBSERVATIONS","မြန်မာနိုင်ငံ • ကမ္ဘာမြေတိုင်းတာချက်များ")}</p><h1>{t("Data workspace","အချက်အလက် လေ့လာရေးနေရာ")}</h1><p>{t("Start with an indicator. Choose a location and dates, then apply to explore NASA observations.","ညွှန်ကိန်းကို အရင်ရွေးပါ။ တည်နေရာနှင့် ရက်စွဲရွေးပြီး NASA တိုင်းတာချက်များကို ကြည့်ရန် နှိပ်ပါ။")}</p></div><span className={`workspace-state ${!p.dirty&&result?"is-applied":""}`} role="status">{p.loading?<LoaderCircle size={16} className="spin"/>:!p.dirty&&result?<Check size={16}/>:<Info size={16}/>} {p.loading?t("Retrieving data…","ဒေတာရယူနေသည်…"):!p.dirty&&result?t("Selection applied","ရွေးချယ်မှု အသုံးပြုပြီး"):t("Selection not applied","ရွေးချယ်မှု မသုံးရသေးပါ")}</span></header>
  <div className="workspace-body" data-navigation-open={navigationOpen} data-controls-open={controlsOpen}>
   <button type="button" className="workspace-edge-toggle workspace-edge-left" hidden={navigationOpen} onClick={()=>setNavigationOpen(true)} aria-expanded={navigationOpen} aria-controls="workspace-navigation" aria-label={t("Show indicators","ညွှန်ကိန်းများ ပြရန်")} title={t("Show indicators","ညွှန်ကိန်းများ ပြရန်")}><ChevronRight size={20}/></button>
   <button type="button" className="workspace-edge-toggle workspace-edge-right" hidden={controlsOpen} onClick={()=>setControlsOpen(true)} aria-expanded={controlsOpen} aria-controls="workspace-controls" aria-label={t("Show view controls","ရွေးချယ်မှုများ ပြရန်")} title={t("Show view controls","ရွေးချယ်မှုများ ပြရန်")}><ChevronLeft size={20}/></button>
   <aside id="workspace-navigation" className="workspace-navigation" tabIndex={0} inert={!navigationOpen} aria-hidden={!navigationOpen} aria-label={t("Environmental indicators","ပတ်ဝန်းကျင် ညွှန်ကိန်းများ")}>
    <button className="workspace-panel-toggle" aria-expanded={navigationOpen} aria-controls="workspace-navigation" aria-label={t("Hide indicators","ညွှန်ကိန်းများ ဖျောက်ရန်")} title={t("Hide indicators","ညွှန်ကိန်းများ ဖျောက်ရန်")} onClick={()=>setNavigationOpen(!navigationOpen)}><span>{t("Indicators","ညွှန်ကိန်းများ")} <small>{count}</small></span><ChevronLeft size={17}/></button>
    <div id="workspace-indicators">
     <label className="workspace-search"><Search size={17}/><span className="sr-only">{t("Search indicators","ညွှန်ကိန်းရှာရန်")}</span><input type="search" value={query} onChange={e=>{setQuery(e.target.value);setNavigationOpen(true);}} placeholder={t("Search indicators…","ညွှန်ကိန်း ရှာရန်…")}/></label>
     {!catalog&&!p.catalogError&&<p role="status">{t("Loading indicator availability…","ညွှန်ကိန်း ရရှိနိုင်မှုကို ရယူနေသည်…")}</p>}
     {p.catalogError&&<p className="workspace-warning" role="alert">{workspaceError(p.catalogError,lang)}</p>}
     {TOPICS.map(topic=>{
      const items=topic.indicators.filter(i=>!query||`${i.label} ${label(i.datasetId??"",i.label)} ${categoryName(topic.id,lang)} ${i.summary}`.toLowerCase().includes(query.toLowerCase()));
      if(!items.length)return null;
      const Icon=icons[topic.id];const open=Boolean(query)||p.openTopic===topic.id;
      return <section className="workspace-category" key={topic.id}>
       <button className="workspace-category-button" data-topic={topic.id} aria-expanded={open} aria-controls={`workspace-category-${topic.id}`} onClick={()=>p.onTopic(topic.id)}><Icon size={19}/><span>{categoryName(topic.id,lang)}</span><small>{items.length}</small><ChevronDown size={15} className={open?"is-open":""}/></button>
       {open&&<div id={`workspace-category-${topic.id}`} className="workspace-indicator-list">{items.map((i,index)=>{
        const d=catalog?.datasets.find(d=>d.id===i.datasetId);const selected=p.datasetId===i.datasetId;
        return <button key={`${i.datasetId}-${index}`} className={`workspace-indicator ${selected?"is-selected":""}`} aria-pressed={selected} onClick={()=>p.onIndicator(i)}><span>{label(i.datasetId??"",i.label)}</span><small data-availability={d?.available?"available":d?.setupRequired?"setup":"unavailable"}><i/>{status(i.datasetId??"")}</small>{selected&&<Check size={14}/>}</button>;
       })}</div>}
      </section>;
     })}
     {query&&!TOPICS.some(topic=>topic.indicators.some(i=>`${i.label} ${label(i.datasetId??"",i.label)} ${categoryName(topic.id,lang)} ${i.summary}`.toLowerCase().includes(query.toLowerCase())))&&<p role="status">{t("No matching indicators. Try another term.","ကိုက်ညီသော ညွှန်ကိန်းမရှိပါ။ အခြားစကားလုံးဖြင့် ရှာပါ။")}</p>}
    </div>
   </aside>
   <div className="workspace-center" role="region" aria-label={t("Map and observation results","မြေပုံနှင့် တိုင်းတာချက်ရလဒ်များ")} tabIndex={0}>
   <section className="workspace-map-card" aria-label={t("Interactive Myanmar map","မြန်မာနိုင်ငံ အပြန်အလှန်မြေပုံ")}>
    <header><div><p className="workspace-eyebrow">{t("MAP","မြေပုံ")}</p><h2>{place||t("Choose a location","တည်နေရာ ရွေးပါ")}</h2></div><p className="workspace-map-guide"><MapPin size={15} aria-hidden="true"/><span>{region?t("Click a township on the map to select it. Click the selected area again to go back.","ရွေးချယ်ရန် မြေပုံပေါ်ရှိ မြို့နယ်ကို နှိပ်ပါ။ ပြန်ထွက်ရန် ရွေးထားသည့်နေရာကို ထပ်နှိပ်ပါ။"):t("Select a region to see townships.","မြို့နယ်များကို ကြည့်ရန် တိုင်းဒေသကြီး သို့မဟုတ် ပြည်နယ်ကို ရွေးပါ။")}</span></p></header>
    <p className="workspace-scroll-hint">{t("Scroll this panel to see results. Ctrl / ⌘ + scroll zooms the map.","ရလဒ်များကို ကြည့်ရန် ဤအကန့်ကို အပေါ်အောက် ရွှေ့ပါ။ မြေပုံချဲ့ရန် Ctrl / ⌘ နှင့် မောက်စ်ဘီးကို တွဲသုံးပါ။")}</p><div className="workspace-map-surface"><MyanmarMap selectedRegionId={p.regionId} onSelectRegion={p.onRegion} language={lang} focusRegion={p.mapFocused} townships={catalog?.townships} selectedTownshipId={p.townshipId} onSelectTownship={p.onTownship}/></div>
    <footer><span><i className="workspace-map-key"/>{t("Selected boundary","ရွေးထားသော နယ်နိမိတ်")}</span><span>{t("Boundary highlight, not a data heatmap","နယ်နိမိတ်ကိုသာ အသားပေးပြထားပြီး ဒေတာပြင်းအားမြေပုံ မဟုတ်ပါ")}</span></footer>
    {region&&<div className="workspace-map-selection"><MapPin size={15}/><span>{place} · {p.locationMode==="township"&&p.townshipId?t("Township","မြို့နယ်"):t("Regional reference point","ဒေသကိုယ်စားပြု တည်နေရာ")}</span><button onClick={()=>p.onRegion("")}>{t("Clear","ရှင်းရန်")}</button></div>}
   </section>
  <section className="workspace-results" aria-label={t("Observation results","တိုင်းတာချက် ရလဒ်များ")} aria-busy={p.loading}>
   <header className="workspace-results-heading"><div><p className="workspace-eyebrow">{t("OBSERVATION SERIES","တိုင်းတာချက် စီးရီး")}</p><h2>{result?label(result.dataset.id,result.dataset.label):t("Your chart will appear here","သင့်ဂရပ်ကို ဤနေရာတွင် ပြမည်")}</h2></div>{result?<span className="workspace-state is-applied"><Check size={15}/>{t("NASA observations","NASA တိုင်းတာချက်များ")}</span>:<ChartNoAxesCombined size={22} className="workspace-chart-heading-icon" aria-hidden="true"/>}</header>
   {result&&<dl className="workspace-result-summary"><div><dt>{t("Selected location","ရွေးထားသော တည်နေရာ")}</dt><dd>{lang==="my"?(result.location??result.region).nameMy:(result.location??result.region).name}</dd></div><div><dt>{t("Latest valid observation","နောက်ဆုံး မှန်ကန်သော တိုင်းတာချက်")}</dt><dd>{latest?.value??"—"} {result.dataset.unit}<small>{latest?.date??"—"}</small></dd></div><div><dt>{t("Requested dates","တောင်းဆိုထားသော ကာလ")}</dt><dd>{result.period.start} — {result.period.end}</dd></div><div><dt>{t("Actual observation dates","အမှန်တကယ် တိုင်းတာထားသော ရက်များ")}</dt><dd>{actual}</dd></div><div><dt>{t("Spatial basis","နေရာအလိုက် တွက်ချက်မှုအခြေခံ")}</dt><dd>{spatialBasisName(result.spatialBasis?.kind??"unknown",lang)}<small>{t("Exact coverage in source details","အကျုံးဝင်မှုအတိအကျကို ရင်းမြစ်အသေးစိတ်တွင် ကြည့်ပါ")}</small></dd></div><div><dt>{t("Valid / missing readings","မှန်ကန် / ပျောက်နေသော တန်ဖိုးများ")}</dt><dd>{valid.length} / {result.missingCount}</dd></div></dl>}
   <div className="workspace-chart">{p.chart}{result&&<details className="workspace-chart-help"><summary>{t("How to read this chart","ဤဇယားကို မည်သို့ဖတ်ရှုရမည်နည်း")}</summary><p>{t("Read dates from left to right and values against the measurement unit. Hover or tap to inspect an observation. Gaps mean missing readings, not zero. Trend lines describe the past; they do not forecast future conditions.","ရက်စွဲကို ဘယ်မှညာသို့ ဖတ်ပြီး တန်ဖိုးများကို ယူနစ်နှင့်တွဲကြည့်ပါ။ တိုင်းတာချက်ကို စစ်ရန် ထောက်ကြည့်ပါ သို့မဟုတ် နှိပ်ပါ။ လစ်လပ်နေရာများသည် ဒေတာမရှိခြင်းဖြစ်ပြီး သုည မဟုတ်ပါ။ လမ်းကြောင်းမျဉ်းများသည် အတိတ်ကိုသာ ဖော်ပြပြီး အနာဂတ်ကို မခန့်မှန်းပါ။")}</p></details>}</div>
  </section>

   <section className="workspace-sources" aria-label={t("Source and scientific context","ရင်းမြစ်နှင့် သိပ္ပံဆိုင်ရာ နောက်ခံအချက်အလက်")}>
    <header><p className="workspace-eyebrow">{t("SOURCES & CONTEXT","ရင်းမြစ်နှင့် နောက်ခံအချက်အလက်")}</p><h2>{t("Detailed info","အသေးစိတ် အချက်အလက်")}</h2></header>
    {result?p.details:<p className="workspace-source-placeholder">{t("After you apply a selection, the NASA source, observation period, spatial basis and limitations appear here.","ရွေးချယ်မှုကို အသုံးပြုပြီးပါက NASA ရင်းမြစ်၊ တိုင်းတာထားသော ကာလ၊ နေရာအခြေခံနှင့် ကန့်သတ်ချက်များကို ဤနေရာတွင် ပြမည်။")}</p>}
   </section>
   </div>
   <aside id="workspace-controls" className="workspace-controls" tabIndex={0} inert={!controlsOpen} aria-hidden={!controlsOpen} aria-label={t("Guided data selection","အဆင့်လိုက် ဒေတာရွေးချယ်ရန်")}>
    <button className="workspace-panel-toggle" aria-expanded={controlsOpen} aria-controls="workspace-controls" aria-label={t("Hide view controls","ရွေးချယ်မှုများ ဖျောက်ရန်")} title={t("Hide view controls","ရွေးချယ်မှုများ ဖျောက်ရန်")} onClick={()=>setControlsOpen(!controlsOpen)}><span>{t("Build your view","လေ့လာရန် ရွေးချယ်ပါ")}</span><ChevronRight size={17}/></button>
    <form id="workspace-control-content" onSubmit={e=>{e.preventDefault();if(!validation&&!p.loading)p.onApply();}}>
     <fieldset className="workspace-step"><legend><b>1</b>{t("Choose a location","တည်နေရာ ရွေးပါ")}</legend>
      <div className="workspace-location-modes" role="group" aria-label={t("Location selection mode","တည်နေရာ ရွေးချယ်မှုနည်းလမ်း")}><button type="button" aria-pressed={p.locationMode==="township"} onClick={()=>p.onLocationMode("township")}>{t("Township","မြို့နယ်")}</button><button type="button" aria-pressed={p.locationMode==="reference"} onClick={()=>p.onLocationMode("reference")}>{t("Reference point","ကိုယ်စားပြုနေရာ")}</button></div>
      <p>{p.locationMode==="township"?t("Analyze satellite data within the selected township boundary.","ရွေးချယ်ထားသော မြို့နယ်နယ်နိမိတ်အတွင်းရှိ ဂြိုဟ်တုအချက်အလက်များကို လေ့လာရန်။"):t("Analyze satellite data around a selected reference location. This is not a township-wide average.","ရွေးချယ်ထားသော တည်နေရာအနီးရှိ ဂြိုဟ်တုအချက်အလက်များကို လေ့လာရန်။ မြို့နယ်တစ်ခုလုံး၏ ပျမ်းမျှတန်ဖိုး မဟုတ်ပါ။")}</p>
      {<p className="workspace-sampling-note">{t("Sampling depends on the product: many datasets use a point or pixel window, not a boundary average. Check Spatial basis after loading.","ထုတ်ကုန်အလိုက် နမူနာကောက်ယူမှု ကွာသည်။ ဒေတာအများစုသည် ကိုယ်စားပြုနေရာ သို့မဟုတ် ပစ်ဇယ်နမူနာဖြစ်ပြီး နယ်နိမိတ်တစ်ခုလုံး၏ ပျမ်းမျှ မဟုတ်ပါ။ ရလဒ်ရှိ နေရာအခြေခံကို စစ်ပါ။")}</p>}
      <label htmlFor="workspace-region">{p.locationMode==="township"?t("State or region","တိုင်းဒေသကြီး သို့မဟုတ် ပြည်နယ်"):t("Regional reference point","ဒေသကိုယ်စားပြု တည်နေရာ")}</label><select id="workspace-region" value={p.regionId} onChange={e=>p.onRegion(e.target.value)}><option value="">{t("Select a state or region","တိုင်းဒေသကြီး သို့မဟုတ် ပြည်နယ်ရွေးပါ")}</option>{REGIONS.map(r=><option key={r.id} value={r.id}>{lang==="my"?r.nameMy:r.name}</option>)}</select>
      {p.locationMode==="township"&&<><label htmlFor="workspace-township">{t("Township","မြို့နယ်")}</label><select id="workspace-township" value={p.townshipId} disabled={!p.regionId} onChange={e=>p.onTownship(e.target.value)}><option value="">{t("Select a township","မြို့နယ် ရွေးပါ")}</option>{catalog?.townships.filter(d=>d.regionId===p.regionId).map(d=><option key={d.id} value={d.id}>{lang==="my"?d.nameMy:d.name}</option>)}</select></>}
     </fieldset>
     <fieldset className="workspace-step"><legend><b>2</b>{t("Choose an indicator","ညွှန်ကိန်း ရွေးပါ")}</legend>
      <label htmlFor="workspace-dataset" className="sr-only">{t("Environmental indicator","ပတ်ဝန်းကျင် ညွှန်ကိန်း")}</label><select id="workspace-dataset" value={p.datasetId} onChange={e=>p.onDataset(e.target.value)}><option value="">{t("Select an indicator","ညွှန်ကိန်း ရွေးပါ")}</option>{TOPICS.map(topic=><optgroup key={topic.id} label={categoryName(topic.id,lang)}>{catalog?.datasets.filter(d=>d.topicId===topic.id).map(d=><option key={d.id} value={d.id}>{label(d.id,d.label)} · {d.unit}{d.available?"":` — ${status(d.id)}`}</option>)}</optgroup>)}</select>
      {ds&&<><p>{indicatorDescription(ds.id,ds.description,lang)}</p><div className="workspace-product-meta"><span>{ds.unit}</span><span className={`workspace-availability ${ds.available?"available":""}`}>{status(ds.id)}</span></div><a className="workspace-source-link" href={ds.source.url} target="_blank" rel="noreferrer">{ds.source.name}<ExternalLink size={12}/></a>{!ds.available&&<p className="workspace-warning">{ds.setupRequired?t("This source must be connected before observations can load.","တိုင်းတာချက်ရယူရန် ဤဒေတာရင်းမြစ်ကို ချိတ်ဆက်ရန် လိုပါသည်။"):t("This indicator is currently unavailable. Choose another indicator.","ဤညွှန်ကိန်းကို လောလောဆယ် မရနိုင်ပါ။ အခြားညွှန်ကိန်းကို ရွေးပါ။")}</p>}</>}
     </fieldset>
     <fieldset className="workspace-step"><legend><b>3</b>{t("Choose dates","ရက်စွဲကာလ ရွေးပါ")}</legend>
      <div className="workspace-dates"><div><label htmlFor="workspace-start">{t("Start date","စတင်ရက်")}</label><input id="workspace-start" type="date" min={dateMin} max={dateMax} value={p.start} onChange={e=>p.onStart(e.target.value)} /></div><div><label htmlFor="workspace-end">{t("End date","ပြီးဆုံးရက်")}</label><input id="workspace-end" type="date" min={dateMin} max={dateMax} value={p.end} onChange={e=>p.onEnd(e.target.value)}/></div></div>
      <p>{t("Available archive","ရရှိနိုင်သော မှတ်တမ်း")}: {dateMin} — {ds?.coverage?.ongoing||!iso(ds?.coverage?.end)?t("latest published observations","နောက်ဆုံးထုတ်ပြန်ထားသော တိုင်းတာချက်များ"):ds?.coverage?.end}</p>
      <p>{t("Dates use UTC. Recent observations may be delayed or missing.","ရက်စွဲများသည် UTC ဖြစ်သည်။ လတ်တလောတိုင်းတာချက်များ ထုတ်ပြန်မှုနောက်ကျခြင်း သို့မဟုတ် ပျောက်နေခြင်း ရှိနိုင်သည်။")}</p>
      {ds?.defaultPeriod&&<button type="button" className="workspace-text-button" onClick={()=>{p.onStart(ds.defaultPeriod!.start);p.onEnd(ds.defaultPeriod!.end);}}>{t("Use suggested historical period","အကြံပြုထားသော သမိုင်းကာလကို သုံးရန်")}</button>}
      {p.datasetId==="fire-detections"&&<p>{t("FIRMS public feed: most recent seven days only; current-day totals are incomplete.","FIRMS အများပြည်သူမှတ်တမ်းတွင် နောက်ဆုံး ၇ ရက်သာ ပါဝင်ပြီး ယနေ့စုစုပေါင်းသည် မပြည့်စုံသေးပါ။")}</p>}
      {validation&&p.start&&p.end&&p.regionId&&<p className="workspace-warning" role="status">{workspaceError(validation,lang)}</p>}
     </fieldset>
     <fieldset className="workspace-step workspace-apply"><legend><b>4</b>{t("Apply & view data","ရွေးချယ်မှုကို အသုံးပြုရန်")}</legend><p>{place||t("No location selected","တည်နေရာ မရွေးရသေးပါ")} · {title}</p><button className="workspace-apply-button" type="submit" disabled={Boolean(validation)||p.loading}>{p.loading?<LoaderCircle size={18} className="spin"/>:<ArrowRight size={18}/>}<span>{p.loading?t("Retrieving observations…","တိုင်းတာချက်များ ရယူနေသည်…"):t("Apply and View Data","ရွေးချယ်ထားသော အချက်အလက်များကို ကြည့်ရန်")}</span></button><p role="status">{validation?workspaceError(validation,lang):p.dirty?t("Ready to apply. Your changes have not been loaded yet.","အသုံးပြုရန် အသင့်ဖြစ်သည်။ ပြောင်းလဲမှုများကို မရယူရသေးပါ။"):t("This selection has been applied.","ဤရွေးချယ်မှုကို အသုံးပြုပြီးဖြစ်သည်။")}</p></fieldset>
     {p.error&&!p.dirty&&<div className="workspace-warning" role="alert">{workspaceError(p.error,lang)}{lang==="my"&&<details><summary>{t("Source response","ရင်းမြစ်၏ မူရင်းတုံ့ပြန်ချက်")}</summary>{p.error}</details>}</div>}
    </form>
   </aside>
  </div>

 </div>;
}
