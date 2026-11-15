"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ChartNoAxesCombined, X } from "lucide-react";
import { SettingsMenu } from "../settings-menu";
import { EarthbeatExperience } from "@/features/explorer/components/EarthbeatExperience";
import { WorkspaceDetails } from "@/features/explorer/components/WorkspaceDetails";
import type { ObservationResponse } from "@/features/explorer/client/data-service";
import "@/features/explorer/components/data-workspace.css";
import "./trends.css";
import { NationwideTrends } from "./NationwideTrends";

export default function TrendsPage() {
 const [lang,setLang]=useState<"en"|"my">("en");
 const [languageReady,setLanguageReady]=useState(false);
 const [result,setResult]=useState<ObservationResponse|null>(null);
 const detail=useRef<HTMLElement>(null);
 const t=(en:string,my:string)=>lang==="my"?my:en;
 useEffect(()=>{try{if(localStorage.getItem("earthlens-language")==="my")setLang("my");}catch{}setLanguageReady(true);},[]);
 useEffect(()=>{if(!languageReady)return;document.documentElement.lang=lang;try{localStorage.setItem("earthlens-language",lang);}catch{}window.dispatchEvent(new CustomEvent("earthlens-language-change",{detail:lang}));},[lang,languageReady]);
 useEffect(()=>{if(result)detail.current?.scrollIntoView({behavior:window.matchMedia("(prefers-reduced-motion: reduce)").matches?"auto":"smooth",block:"start"});},[result]);
 return <main className="earthlens-app workspace-redesign trends-page" lang={lang}>
  <header className="site-header"><a className="brand-lockup" href="/"><img className="earthlens-brand-art" src="/brand/chainsa-icon.png" alt=""/><span className="brand-text"><strong className="chainsa-wordmark" aria-label="ChainSa">Ch<span className="brand-letter-yellow">a</span><span className="brand-letter-blue">i</span>nSa</strong><small>{t("MYANMAR EARTH INTELLIGENCE", "မြန်မာ့ပတ်ဝန်းကျင်ဆိုင်ရာ အချက်အလက်များ")}</small></span></a><SettingsMenu lang={lang} onLanguage={setLang}/></header>
  <div className="workspace-shell"><a className="button-secondary trends-back" href="/"><ArrowLeft size={16}/>{t("Home","ပင်မစာမျက်နှာ")}</a>
   <header className="workspace-heading"><div><p className="workspace-eyebrow">{t("OBSERVED CHANGE","တိုင်းတာထားသော ပြောင်းလဲမှု")}</p><h1>{t("Significant Trends","စာရင်းအင်းအရ ထင်ရှားသော လမ်းကြောင်းများ")}</h1><p>{t("Discover observed trends automatically. Open a finding to see its graph, evidence and source.","တွေ့ရှိထားသော လမ်းကြောင်းများကို အလိုအလျောက် ကြည့်ရှုပါ။ ဂရပ်၊ အထောက်အထားနှင့် ရင်းမြစ်ကို ကြည့်ရန် တွေ့ရှိချက်တစ်ခုကို ဖွင့်ပါ။")}</p></div><ChartNoAxesCombined size={34}/></header>
   <NationwideTrends lang={lang} onInspect={setResult}/>
   {result&&<section className="trends-results" ref={detail} aria-label={t("Finding details","တွေ့ရှိချက် အသေးစိတ်")}>
    <header className="finding-detail-heading"><div><p className="workspace-eyebrow">{t("FINDING DETAILS","တွေ့ရှိချက် အသေးစိတ်")}</p><h2>{lang==="my"?result.region.nameMy:result.region.name}</h2></div><button type="button" className="button-secondary" onClick={()=>setResult(null)} aria-label={t("Close finding details","တွေ့ရှိချက် အသေးစိတ် ပိတ်ရန်")}><X size={18}/></button></header>
    <EarthbeatExperience key={`${result.region.id}:${result.period.start}:${result.period.end}`} result={result} lang={lang} expandScientificNotes/>
    <section className="workspace-sources"><h2>{t("Source & limitations","ရင်းမြစ်နှင့် ကန့်သတ်ချက်များ")}</h2><WorkspaceDetails lang={lang} result={result}/></section>
   </section>}
  </div>
 </main>;
}
