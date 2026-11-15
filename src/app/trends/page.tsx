"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ChartNoAxesCombined } from "lucide-react";
import { SettingsMenu } from "../settings-menu";
import { EarthbeatExperience } from "@/features/explorer/components/EarthbeatExperience";
import { WorkspaceDetails } from "@/features/explorer/components/WorkspaceDetails";
import { fetchExploreCatalog, fetchObservations, responseMatchesSelection, type ExploreCatalog, type ObservationResponse } from "@/features/explorer/client/data-service";
import { selectionError } from "@/features/explorer/workspace-selection";
import { workspaceError } from "@/features/explorer/workspace-copy";
import "@/features/explorer/components/data-workspace.css";
import "./trends.css";
import { NationwideTrends } from "./NationwideTrends";

export default function TrendsPage() {
 const [lang,setLang]=useState<"en"|"my">("en"),[catalog,setCatalog]=useState<ExploreCatalog|null>(null);
 const [region,setRegion]=useState(""),[township,setTownship]=useState(""),[start,setStart]=useState(""),[end,setEnd]=useState("");
 const [result,setResult]=useState<ObservationResponse|null>(null),[loading,setLoading]=useState(false),[error,setError]=useState("");
 const request=useRef<AbortController|null>(null);
 const t=(en:string,my:string)=>lang==="my"?my:en;
 useEffect(()=>{const saved=localStorage.getItem("earthlens-language");if(saved==="my")setLang("my");const c=new AbortController();fetchExploreCatalog(c.signal).then(setCatalog).catch(e=>{if(!c.signal.aborted)setError(e.message)});return()=>{c.abort();request.current?.abort()};},[]);
 useEffect(()=>{document.documentElement.lang=lang;localStorage.setItem("earthlens-language",lang);window.dispatchEvent(new CustomEvent("earthlens-language-change",{detail:lang}));},[lang]);
 const selection={topicId:"agriculture" as const,regionId:region,townshipId:township||undefined,datasetId:"air-temperature",start,end};
 const dataset=catalog?.datasets.find(d=>d.id==="air-temperature");
 const validation=selectionError(selection,dataset,township?"township":"reference");
 function edit(change:()=>void){request.current?.abort();setLoading(false);setResult(null);setError("");change();}
 async function apply(){if(validation)return;request.current?.abort();const c=new AbortController();request.current=c;setLoading(true);setResult(null);setError("");try{const data=await fetchObservations(selection,c.signal);if(c.signal.aborted)return;if(!responseMatchesSelection(data,selection))throw Error("The data source returned a different location or period. Please try this search again.");setResult(data);}catch(e){if(!c.signal.aborted)setError(e instanceof Error?e.message:"Could not retrieve observations.");}finally{if(!c.signal.aborted)setLoading(false);}}
 return <main className="earthlens-app workspace-redesign trends-page" lang={lang}>
  <header className="site-header"><a className="brand-lockup" href="/"><img className="earthlens-brand-art" src="/brand/chainsa-icon.png" alt=""/><span className="brand-text"><strong className="chainsa-wordmark" aria-label="ChainSa">Ch<span className="brand-letter-yellow">a</span><span className="brand-letter-blue">i</span>nSa</strong><small>{t("MYANMAR EARTH INTELLIGENCE", "မြန်မာ့ပတ်ဝန်းကျင်ဆိုင်ရာ အချက်အလက်များ")}</small></span></a><SettingsMenu lang={lang} onLanguage={setLang}/></header>
  <div className="workspace-shell"><a className="button-secondary trends-back" href="/"><ArrowLeft size={16}/>{t("Home","ပင်မစာမျက်နှာ")}</a>
   <header className="workspace-heading"><div><p className="workspace-eyebrow">{t("OBSERVED CHANGE","တိုင်းတာထားသော ပြောင်းလဲမှု")}</p><h1>{t("Significant Trends","စာရင်းအင်းအရ ထင်ရှားသော လမ်းကြောင်းများ")}</h1><p>{t("Explore NASA POWER air temperature and inspect its statistical trend evidence.","NASA POWER လေထုအပူချိန်နှင့် စာရင်းအင်း လမ်းကြောင်း အထောက်အထားများကို လေ့လာပါ။")}</p></div><ChartNoAxesCombined size={34}/></header>
   <NationwideTrends lang={lang} onInspect={data=>{request.current?.abort();setLoading(false);setError("");setRegion(data.region.id);setTownship("");setStart(data.period.start);setEnd(data.period.end);setResult(data);requestAnimationFrame(()=>document.getElementById("location-analysis")?.scrollIntoView({behavior:"smooth"}));}}/>
   <h2 id="location-analysis">{t("Explore one location in detail","တည်နေရာတစ်ခုကို အသေးစိတ် လေ့လာရန်")}</h2>
   <form className="trends-form workspace-step" onSubmit={e=>{e.preventDefault();void apply()}}>
    <div><label htmlFor="trend-region">{t("State or regional reference point","တိုင်းဒေသကြီး သို့မဟုတ် ပြည်နယ် ကိုယ်စားပြုနေရာ")}</label><select id="trend-region" value={region} onChange={e=>edit(()=>{setRegion(e.target.value);setTownship("")})}><option value="">{t("Choose a location","တည်နေရာ ရွေးပါ")}</option>{catalog?.regions.map(r=><option key={r.id} value={r.id}>{lang==="my"?r.nameMy:r.name}</option>)}</select></div>
    <div><label htmlFor="trend-township">{t("Township (optional)","မြို့နယ် (ရွေးချယ်နိုင်သည်)")}</label><select id="trend-township" value={township} disabled={!region} onChange={e=>edit(()=>setTownship(e.target.value))}><option value="">{t("Use regional reference point","ဒေသ ကိုယ်စားပြုနေရာကို သုံးရန်")}</option>{catalog?.townships.filter(x=>x.regionId===region).map(x=><option key={x.id} value={x.id}>{lang==="my"?x.nameMy:x.name}</option>)}</select></div>
    <div><label htmlFor="trend-start">{t("Start date","စတင်ရက်")}</label><input id="trend-start" type="date" min="1981-01-01" max={new Date().toISOString().slice(0,10)} value={start} onChange={e=>edit(()=>setStart(e.target.value))}/></div>
    <div><label htmlFor="trend-end">{t("End date","ပြီးဆုံးရက်")}</label><input id="trend-end" type="date" min="1981-01-01" max={new Date().toISOString().slice(0,10)} value={end} onChange={e=>edit(()=>setEnd(e.target.value))}/></div>
    <button className="workspace-apply-button" disabled={!!validation||loading}>{loading?t("Retrieving observations…","တိုင်းတာချက်များ ရယူနေသည်…"):t("Analyze trends","လမ်းကြောင်း လေ့လာရန်")}</button>
    <p className="trends-guidance">{t("Significance requires at least three years, 24 usable monthly means, and coverage and independence checks. Use 2009 onward to avoid the known POWER discontinuity. Point samples are not township or region averages; recent data may be delayed. Dates use UTC.","ထင်ရှားမှုစမ်းသပ်ရန် အနည်းဆုံး ၃ နှစ်၊ အသုံးပြုနိုင်သော လစဉ်ပျမ်းမျှ ၂၄ ခုနှင့် လွှမ်းခြုံမှု၊ သီးခြားလွတ်လပ်မှု စစ်ဆေးချက်များ လိုသည်။ POWER ဒေတာအဆက်ပြတ်မှုကို ရှောင်ရန် ၂၀၀၉ နောက်ပိုင်းကို သုံးပါ။ နေရာအမှတ် နမူနာများသည် မြို့နယ် သို့မဟုတ် ဒေသပျမ်းမျှ မဟုတ်ပါ။ လတ်တလောဒေတာ နောက်ကျနိုင်သည်။ ရက်စွဲများသည် UTC ဖြစ်သည်။")}</p>
   </form>
   {error&&<p role="alert" className="workspace-warning">{workspaceError(error,lang)}</p>}
   <section className="trends-results" aria-busy={loading}>{result?<><EarthbeatExperience result={result} lang={lang} expandScientificNotes/><section className="workspace-sources"><h2>{t("Source & limitations","ရင်းမြစ်နှင့် ကန့်သတ်ချက်များ")}</h2><WorkspaceDetails lang={lang} result={result}/></section></>:<div className="trends-empty" role="status"><ChartNoAxesCombined size={32}/><h2>{loading?t("Retrieving observations…","တိုင်းတာချက်များ ရယူနေသည်…"):t("Choose a location and dates to begin","စတင်ရန် တည်နေရာနှင့် ရက်စွဲ ရွေးပါ")}</h2><p>{t("Results use the existing scientific tests. Insufficient evidence is shown explicitly; observations are not forecasts.","လက်ရှိ သိပ္ပံစမ်းသပ်နည်းများကို အသုံးပြုသည်။ အထောက်အထား မလုံလောက်လျှင် ရှင်းလင်းဖော်ပြမည်။ တိုင်းတာချက်များသည် ခန့်မှန်းချက်များ မဟုတ်ပါ။")}</p></div>}</section>
  </div>
 </main>;
}
