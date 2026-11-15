"use client";

import { useState } from "react";
import type { DatasetDefinition } from "../catalog";
import type { ObservationResponse } from "../client/data-service";
import { indicatorDescription, indicatorLimitations, indicatorName, spatialBasisName } from "../workspace-copy";

export function WorkspaceDetails({lang,result,dataset}:{lang:"en"|"my";result:ObservationResponse|null;dataset?:DatasetDefinition}) {
 const [page,setPage]=useState(0);
 const pageSize=25;
 const totalPages=Math.max(1,Math.ceil((result?.observations.length??0)/pageSize));
 const currentPage=Math.min(page,totalPages-1);
 const t=(en:string,my:string)=>lang==="my"?my:en;
 const data=result?.dataset??dataset;
 if(!data)return <p>{t("Choose an indicator to see its source and scientific limitations.","ရင်းမြစ်နှင့် သိပ္ပံဆိုင်ရာ ကန့်သတ်ချက်များကို ကြည့်ရန် ညွှန်ကိန်းရွေးပါ။")}</p>;
 return <div className="workspace-source-details">
  <h3>{indicatorName(data.id,data.label,lang)}</h3>
  <p>{indicatorDescription(data.id,data.description,lang)}</p>
  <dl className="workspace-metadata">
   <div><dt>{t("Data source","ဒေတာရင်းမြစ်")}</dt><dd><a href={data.source.url} target="_blank" rel="noreferrer">{data.source.name} ↗</a></dd></div>
   <div><dt>{t("Measurement unit","တိုင်းတာမှု ယူနစ်")}</dt><dd>{data.unit}</dd></div>
   {result&&<><div><dt>{t("Spatial basis","နေရာအလိုက် တွက်ချက်မှုအခြေခံ")}</dt><dd>{spatialBasisName(result.spatialBasis?.kind??"unknown",lang)}</dd></div><div><dt>{t("Data retrieved","ဒေတာရယူချိန်")}</dt><dd>{new Date(result.observedAt).toLocaleString(lang==="my"?"my-MM":"en-GB")}</dd></div></>}
  </dl>
  {result?.dataWarning&&<p className="workspace-warning" role="note">{lang==="my"?"NASA POWER မှတ်တမ်းတွင် ၂၀၀၈ ခုနှစ်အတွင်း အဆက်ပြတ်ပြောင်းလဲမှုရှိသည်။ ၂၀၀၉ ခုနှစ်မှစသော တန်ဖိုးများကိုသာ နှိုင်းယှဉ်ပါ။":result.dataWarning}</p>}
  {result&&<details className="workspace-observation-table"><summary>{t("View actual observations","မူရင်း တိုင်းတာချက်များကို ကြည့်ရန်")} ({result.observations.length})</summary>
   <table><caption>{t("NASA observations · missing readings are shown as —","NASA တိုင်းတာချက်များ · ဒေတာမရှိလျှင် — ဖြင့်ပြသည်")}</caption><thead><tr><th scope="col">{t("Date (UTC)","ရက်စွဲ (UTC)")}</th><th scope="col">{data.unit}</th></tr></thead><tbody>{result.observations.slice(currentPage*pageSize,(currentPage+1)*pageSize).map((observation,index)=><tr key={`${observation.date}-${index}`}><td>{observation.date}</td><td>{observation.value!==null&&Number.isFinite(observation.value)?observation.value:"—"}</td></tr>)}</tbody></table>
   {totalPages>1&&<div className="workspace-table-pages"><button type="button" disabled={currentPage===0} onClick={()=>setPage(currentPage-1)}>{t("Previous","ရှေ့သို့")}</button><span>{currentPage+1} / {totalPages}</span><button type="button" disabled={currentPage===totalPages-1} onClick={()=>setPage(currentPage+1)}>{t("Next","နောက်သို့")}</button></div>}
  </details>}
  <h4>{t("Scientific limitations","သိပ္ပံဆိုင်ရာ ကန့်သတ်ချက်များ")}</h4><p>{indicatorLimitations(data.id,data.limitations,lang)}</p>
  <details><summary>{t("Original product metadata & resolution","မူရင်းထုတ်ကုန် အချက်အလက်နှင့် ပစ်ဇယ်အရွယ်အစား")}</summary><dl className="workspace-metadata"><div><dt>{t("Product description","ထုတ်ကုန်ဖော်ပြချက်")}</dt><dd>{data.description}</dd></div><div><dt>{t("Spatial resolution & coverage","နေရာအရွယ်အစားနှင့် အကျုံးဝင်မှု")}</dt><dd>{result?.geographicCoverage??t("Exact sample coverage is returned with the observations.","နမူနာအကျုံးဝင်မှုအတိအကျကို တိုင်းတာချက်နှင့်အတူ ပြမည်။")}</dd></div><div><dt>{t("Sampling details","နမူနာကောက်ယူမှု အသေးစိတ်")}</dt><dd>{result?.spatialBasis?.label??"—"}</dd></div><div><dt>{t("Limitations (provider metadata)","ရင်းမြစ်၏ မူရင်းကန့်သတ်ချက်များ")}</dt><dd>{data.limitations}</dd></div>{result?.qaPolicy&&<div><dt>QA</dt><dd>{result.qaPolicy}</dd></div>}</dl></details>
 </div>;
}
