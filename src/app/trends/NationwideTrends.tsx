"use client";

import { useEffect, useState } from "react";
import { ArrowDownRight, ArrowUpRight, ArrowRight, ChartNoAxesCombined } from "lucide-react";
import { REGIONS } from "@/features/earthlens-chat/regions";
import { fetchObservations,responseMatchesSelection,type ObservationResponse } from "@/features/explorer/client/data-service";
import { chartText } from "@/features/environmental/components/chartCopy";
import { nationalPeriod,nationwideStatus,nationwideTrend } from "./nationwide";

type Row={id:string;data?:ObservationResponse;analysis?:ReturnType<typeof nationwideTrend>;error?:boolean};
export function NationwideTrends({lang,onInspect}:{lang:"en"|"my";onInspect:(result:ObservationResponse)=>void}) {
 const t=(en:string,my:string)=>lang==="my"?my:en;
 const [period]=useState(()=>nationalPeriod());
 const [rows,setRows]=useState<Row[]>(()=>REGIONS.map(r=>({id:r.id}))),[busy,setBusy]=useState(true);
 useEffect(()=>{
  const c=new AbortController();let next=0;
  const worker=async()=>{
   while(next<REGIONS.length&&!c.signal.aborted){
    const region=REGIONS[next++];
    const selection={topicId:"agriculture" as const,regionId:region.id,datasetId:"air-temperature",...period};
    try{
     const data=await fetchObservations(selection,c.signal);
     if(c.signal.aborted)return;
     if(!responseMatchesSelection(data,selection))throw Error("Unexpected location or observation period.");
     const row={id:region.id,data,analysis:nationwideTrend(data)};
     setRows(current=>current.map(x=>x.id===region.id?row:x));
    }catch{if(c.signal.aborted)return;setRows(current=>current.map(x=>x.id===region.id?{id:region.id,error:true}:x));}
   }
  };
  void Promise.all([worker(),worker(),worker()]).then(()=>{if(!c.signal.aborted)setBusy(false)});
  return()=>c.abort();
 },[period]);
 const complete=rows.filter(r=>r.analysis||r.error).length;
 const findings=rows.filter(r=>r.data&&r.analysis&&nationwideStatus(r.analysis)==="significant");
 const unavailable=rows.filter(r=>r.error||r.analysis&&nationwideStatus(r.analysis)==="unavailable").length;
 return <section className="national-trends" aria-labelledby="national-title" aria-busy={busy}>
  <header><p className="workspace-eyebrow">{t("AUTOMATIC FINDINGS","အလိုအလျောက် တွေ့ရှိချက်များ")}</p><h2 id="national-title">{t("Trends across Myanmar","မြန်မာနိုင်ငံတစ်ဝန်း လမ်းကြောင်းများ")}</h2><p>{t("NASA POWER air temperature at 15 state, region and territory reference points.","တိုင်းဒေသကြီး၊ ပြည်နယ်နှင့် ပြည်ထောင်စုနယ်မြေ ကိုယ်စားပြုနေရာ ၁၅ ခုရှိ NASA POWER လေထုအပူချိန်။")}</p></header>
  <p className="finding-period">{t("Observation period","တိုင်းတာမှုကာလ")}: <strong>{period.start} — {period.end}</strong><span>{t("The latest five complete calendar years are selected automatically.","နောက်ဆုံး ပြည့်စုံသော ပြက္ခဒိန်နှစ် ၅ နှစ်ကို အလိုအလျောက် အသုံးပြုသည်။")}</span></p>
  <div className="national-progress" role="status"><p>{busy?t("Checking observations…","တိုင်းတာချက်များကို စစ်ဆေးနေသည်…"):t("Observation checks complete","တိုင်းတာချက် စစ်ဆေးမှု ပြီးပါပြီ")} · {complete} / {REGIONS.length} {t("locations","နေရာများ")} · {findings.length} {t("supported findings","အထောက်အထားရှိသော တွေ့ရှိချက်များ")}</p></div>
  <div className="finding-grid">
   {findings.map(row=><TrendFindingCard key={row.id} lang={lang} data={row.data!} analysis={row.analysis!} onInspect={onInspect}/>)}
  </div>
  {busy&&<p className="findings-loading" role="status">{t("Findings will appear here as the source checks finish.","ရင်းမြစ်စစ်ဆေးမှုများ ပြီးဆုံးသည်နှင့် တွေ့ရှိချက်များကို ဤနေရာတွင် ပြမည်။")}</p>}
  {!busy&&!findings.length&&<div className="trends-empty"><ChartNoAxesCombined size={30}/><h3>{t("No supported significant findings to show","ဖော်ပြရန် အထောက်အထားခိုင်လုံသော ထင်ရှားသည့် တွေ့ရှိချက် မရှိပါ")}</h3><p>{t("This does not mean that conditions have not changed. Some observations may be unavailable or may not meet the statistical requirements.","အခြေအနေများ မပြောင်းလဲဟု မဆိုလိုပါ။ အချို့တိုင်းတာချက်များ မရရှိနိုင်ခြင်း သို့မဟုတ် စာရင်းအင်းလိုအပ်ချက်များ မပြည့်မီခြင်း ရှိနိုင်သည်။")}</p></div>}
  <details className="finding-method"><summary>{t("About these findings and coverage","တွေ့ရှိချက်များနှင့် အကျုံးဝင်မှုအကြောင်း")}</summary>
   <p>{t("These are reference-point observations. They are not whole-region averages or a survey of every township. Only air temperature currently has an implemented significance test.","ဤတိုင်းတာချက်များသည် ကိုယ်စားပြုနေရာအမှတ်များအတွက် ဖြစ်သည်။ ဒေသတစ်ခုလုံး ပျမ်းမျှ သို့မဟုတ် မြို့နယ်အားလုံး၏ စစ်တမ်း မဟုတ်ပါ။ လက်ရှိတွင် လေထုအပူချိန်အတွက်သာ ထင်ရှားမှုစမ်းသပ်ချက် ရှိသည်။")}</p>
   <p>{t("The experimental seasonal Mann–Kendall / Sen’s slope test uses p < 0.05 at each point, without adjustment for testing multiple locations. Coverage or serial dependence checks can withhold a result. A significant trend describes the observed period; it is not a forecast or proof of causation.","စမ်းသပ်ဆဲ ရာသီအလိုက် Mann–Kendall / Sen နည်းတွင် နေရာတစ်ခုစီအတွက် p < 0.05 ကို သုံးသည်။ နေရာများစွာ စမ်းသပ်မှုအတွက် ချိန်ညှိမထားပါ။ အချက်အလက်လွှမ်းခြုံမှု သို့မဟုတ် အချိန်ဆက်စပ်မှု စစ်ဆေးချက်ကြောင့် ရလဒ်ကို မဖော်ပြနိုင်ပါ။ ထင်ရှားသောလမ်းကြောင်းသည် တိုင်းတာကာလကိုသာ ဖော်ပြပြီး ခန့်မှန်းချက် သို့မဟုတ် အကြောင်းရင်းသက်သေ မဟုတ်ပါ။")}</p>
   <p>{unavailable} {t("locations have unavailable observations or tests.","နေရာတွင် တိုင်းတာချက် သို့မဟုတ် စမ်းသပ်ချက် မရရှိပါ။")}</p>
   <ul className="finding-coverage">{rows.map(row=>{const region=REGIONS.find(r=>r.id===row.id)!;return <li key={row.id}><strong>{lang==="my"?region.nameMy:region.name}</strong><span>{row.error?t("Source unavailable","ရင်းမြစ် မရရှိပါ"):row.analysis?chartText(lang,row.analysis.interpretation):t("Checking…","စစ်ဆေးနေသည်…")}</span></li>})}</ul>
   <a href="https://power.larc.nasa.gov/docs/services/api/temporal/daily/" target="_blank" rel="noreferrer">NASA POWER ↗</a>
  </details>
 </section>;
}

export function TrendFindingCard({lang,data,analysis,onInspect}:{lang:"en"|"my";data:ObservationResponse;analysis:ReturnType<typeof nationwideTrend>;onInspect:(data:ObservationResponse)=>void}) {
 if(nationwideStatus(analysis)!=="significant")return null;
 const t=(en:string,my:string)=>lang==="my"?my:en;
 const increasing=analysis.trendDirection==="increasing";
 const Icon=increasing?ArrowUpRight:ArrowDownRight;
 return <article className="trend-finding" data-direction={analysis.trendDirection}>
  <span className="national-status significant">{t("Statistically significant","စာရင်းအင်းအရ ထင်ရှားသည်")}</span>
  <h3>{lang==="my"?data.region.nameMy:data.region.name}</h3>
  <p className="finding-direction"><Icon size={24}/>{increasing?t("Air temperature is increasing","လေထုအပူချိန် တိုးလာသည်"):analysis.trendDirection==="decreasing"?t("Air temperature is decreasing","လေထုအပူချိန် လျော့လာသည်"):t("Observed temperature trend","တွေ့ရှိသော အပူချိန်လမ်းကြောင်း")}</p>
  <dl><div><dt>{t("Estimated trend rate","ခန့်မှန်း လမ်းကြောင်းနှုန်း")}</dt><dd>{analysis.senSlope===undefined?"—":`${analysis.senSlope>0?"+":""}${analysis.senSlope.toFixed(4)}`} {t("°C/year","°C/နှစ်")}</dd></div><div><dt>{t("Observed dates","တိုင်းတာထားသော ရက်များ")}</dt><dd>{analysis.analysisPeriod?.start??data.period.start} — {analysis.analysisPeriod?.end??data.period.end}</dd></div></dl>
  <p>{t("Regional reference point","ဒေသကိုယ်စားပြု တည်နေရာအမှတ်")} · NASA POWER</p>
  <button type="button" className="button-secondary" onClick={()=>onInspect(data)}>{t("View graph & evidence","ဂရပ်နှင့် အထောက်အထား ကြည့်ရန်")}<ArrowRight size={16}/></button>
 </article>;
}
