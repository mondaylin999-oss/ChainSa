import type { ObservationResponse } from "../client/data-service";
import { indicatorName, indicatorDescription, spatialBasisName } from "../workspace-copy";
import styles from "./EarthbeatExperience.module.css";

export function GraphExplanation({result,lang}:{result:ObservationResponse;lang:"en"|"my"}) {
 const t=(en:string,my:string)=>lang==="my"?my:en;
 const readings=result.observations.filter(o=>o.value!==null&&Number.isFinite(o.value)).sort((a,b)=>a.date.localeCompare(b.date));
 const values=readings.map(o=>o.value!);
 const low=readings.reduce<(typeof readings)[number]|undefined>((best,o)=>!best||o.value!<best.value!?o:best,undefined);
 const high=readings.reduce<(typeof readings)[number]|undefined>((best,o)=>!best||o.value!>best.value!?o:best,undefined);
 const mean=values.length?values.reduce((sum,v)=>sum+v,0)/values.length:null;
 const number=(v:number|null|undefined)=>v==null?"—":new Intl.NumberFormat(lang==="my"?"my-MM":"en",{maximumFractionDigits:2}).format(v);
 const place=result.location??result.region;
 const unit=result.dataset.unit;
 const dailyRain=result.dataset.parameter==="PRECTOTCORR";
 const definitions=[
  [t("Mean","ပျမ်းမျှ"),number(mean),t("The average of the available valid readings in this period. Missing readings are excluded.","ဤကာလအတွင်း ရရှိသော မှန်ကန်သည့် တိုင်းတာချက်များ၏ ပျမ်းမျှဖြစ်သည်။ ပျောက်နေသော တန်ဖိုးများကို မထည့်တွက်ပါ။")],
  [t("Minimum","အနိမ့်ဆုံး"),number(low?.value),t("The lowest valid reading in the selected period.","ရွေးထားသော ကာလအတွင်း အနိမ့်ဆုံး မှန်ကန်သော တိုင်းတာချက် ဖြစ်သည်။")],
  [t("Maximum","အမြင့်ဆုံး"),number(high?.value),t("The highest valid reading in the selected period.","ရွေးထားသော ကာလအတွင်း အမြင့်ဆုံး မှန်ကန်သော တိုင်းတာချက် ဖြစ်သည်။")],
  [t("Observations","တိုင်းတာချက်များ"),`${number(values.length)} / ${number(result.observations.length)}`,t("Valid readings / all readings returned by the source. This does not guarantee that every expected day or satellite visit is present.","အသုံးပြုနိုင်သော တိုင်းတာချက် / ရင်းမြစ်မှ ပြန်ပေးသော တိုင်းတာချက်အားလုံး ဖြစ်သည်။ မျှော်မှန်းထားသော နေ့တိုင်း သို့မဟုတ် ဂြိုဟ်တုဖြတ်သန်းချိန်တိုင်း ပါဝင်ကြောင်း အာမမခံပါ။")],
 ];
 return <section className={styles.explanation} aria-label={t("Your graph explained","သင့်ဂရပ်အကြောင်း ရှင်းလင်းချက်")}>
  <h3>{t("What this graph shows","ဤဂရပ်က ဖော်ပြသည့်အရာ")}</h3>
  <p><strong>{lang==="my"?place.nameMy:place.name}</strong> · {indicatorName(result.dataset.id,result.dataset.label,lang)} · {result.period.start} — {result.period.end}</p>
  <p>{indicatorDescription(result.dataset.id,result.dataset.description,lang)}</p>
  <p>{t("Read dates from left to right. Higher points show higher measured values; lower points show lower values. A gap means a reading is missing, not zero.","ရက်စွဲများကို ဘယ်မှညာသို့ ဖတ်ပါ။ မြင့်သောအမှတ်များသည် တန်ဖိုးများခြင်း၊ နိမ့်သောအမှတ်များသည် တန်ဖိုးနည်းခြင်းကို ပြသည်။ လစ်လပ်နေရာသည် တိုင်းတာချက်မရှိခြင်း ဖြစ်ပြီး သုည မဟုတ်ပါ။")}</p>
  {values.length>0?<p>{t("For the available readings, the average is","ရရှိသော တိုင်းတာချက်များ၏ ပျမ်းမျှမှာ")} <strong>{number(mean)} {unit}</strong>. {t("The lowest reading is","အနိမ့်ဆုံးမှာ")} {number(low?.value)} {unit} ({low?.date}); {t("the highest is","အမြင့်ဆုံးမှာ")} <strong>{number(high?.value)} {unit}</strong> ({high?.date}). {t("Actual readings cover","အမှန်တကယ် တိုင်းတာရက်များမှာ")} {readings[0].date} — {readings.at(-1)!.date}.</p>:<p>{t("No valid readings are available to summarize.","အကျဉ်းချုပ်ရန် မှန်ကန်သော တိုင်းတာချက် မရရှိပါ။")}</p>}
  {dailyRain&&<p>{t("mm/day means millimetres of rainfall per day. The mean is an average daily value, not the total rainfall for the period.","mm/day သည် တစ်ရက်လျှင် မိုးရေချိန် မီလီမီတာကို ဆိုလိုသည်။ ပျမ်းမျှသည် နေ့စဉ်ပျမ်းမျှဖြစ်ပြီး ကာလတစ်ခုလုံး၏ စုစုပေါင်း မိုးရေချိန် မဟုတ်ပါ။")}</p>}
  {unit==="°C"&&<p>{t("°C means degrees Celsius: higher values mean a warmer reading. Surface temperature describes the ground surface; air temperature describes the air.","°C သည် ဒီဂရီစင်တီဂရိတ် ဖြစ်သည်။ တန်ဖိုးမြင့်လျှင် ပိုပူသည်။ မျက်နှာပြင်အပူချိန်သည် မြေမျက်နှာပြင်ကို တိုင်းတာပြီး လေထုအပူချိန်သည် လေကို တိုင်းတာသည်။")}</p>}
  <p>{t("Measurement coverage","တိုင်းတာမှု အကျုံးဝင်မှု")}: <strong>{spatialBasisName(result.spatialBasis?.kind??"unknown",lang)}</strong>. {t("A point or pixel sample does not represent an average for the whole township or region. Observations describe the past and are not forecasts.","နေရာအမှတ် သို့မဟုတ် ပစ်ဇယ်နမူနာသည် မြို့နယ် သို့မဟုတ် ဒေသတစ်ခုလုံး ပျမ်းမျှကို မကိုယ်စားပြုပါ။ တိုင်းတာချက်များသည် အတိတ်အခြေအနေဖြစ်ပြီး ခန့်မှန်းချက် မဟုတ်ပါ။")}</p>
  <dl className={styles.summary}>{definitions.map(([label,value,meaning],i)=><div key={label}><dt>{label}</dt><dd>{value} {i<3&&<small>{unit}</small>}</dd><p>{meaning}</p></div>)}</dl>
 </section>;
}
