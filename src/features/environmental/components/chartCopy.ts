import sharedCopy from "../../../../public/myanmar-copy.json";
import { DATASETS } from "../../explorer/catalog";
import { indicatorName } from "../../explorer/workspace-copy";

/** Presentation-only translations. Unknown provider metadata is retained verbatim. */
export type ChartLanguage = "en" | "my";

const my: Record<string, string> = {
  "Interactive observation graph": "တိုင်းတာချက်များကို ရွေးချယ်နိုင်သော ဂရပ်",
  "No observation selected": "တိုင်းတာချက် မရွေးရသေးပါ",
  "EARTHBEAT sound controls": "EARTHBEAT အသံထိန်းချုပ်မှုများ",
  "Stop EARTHBEAT sound": "EARTHBEAT အသံရပ်ရန်",
  "Play EARTHBEAT sound": "EARTHBEAT အသံဖွင့်ရန်",
  "No reading": "တိုင်းတာချက်မရှိပါ",
  "Click the speaker to hear this graph.": "ဤဂရပ်ကို အသံဖြင့်နားထောင်ရန် စပီကာခလုတ်ကို နှိပ်ပါ။",
  "Sound follows the graph smoothly and repeats every 24 seconds until stopped. Missing readings and long gaps are silent.": "အသံသည် ဂရပ်အတိုင်း ဆက်တိုက်ပြောင်းလဲပြီး မရပ်မချင်း 24 စက္ကန့်တစ်ကြိမ် ထပ်ဖွင့်ပါသည်။ တိုင်းတာချက်ပျောက်နေသည့် နေရာများနှင့် အချိန်ကွာဟမှုရှည်သော နေရာများတွင် အသံမထွက်ပါ။",
  "Audio could not start. Check your browser sound settings and try the speaker button again.": "အသံဖွင့်မရပါ။ ဘရောက်ဇာ၏ အသံဆက်တင်များကို စစ်ပြီး စပီကာခလုတ်ကို ထပ်နှိပ်ပါ။",
  "Sound is unavailable in this browser.": "ဤဘရောက်ဇာတွင် အသံဖွင့်၍မရပါ။",
  "Use Left/Right arrows, Home or End to select a reading; Enter or Space plays or pauses sound.": "တိုင်းတာချက်ရွေးရန် ဘယ်/ညာ မြားခလုတ်၊ Home သို့မဟုတ် End ကို သုံးပါ။ အသံဖွင့်/ခေတ္တရပ်ရန် Enter သို့မဟုတ် Space ကို နှိပ်ပါ။",
  "Loading NASA observations…": "NASA တိုင်းတာချက်များကို ရယူနေသည်…",
  "Unable to load environmental data": "ပတ်ဝန်းကျင်အချက်အလက် ရယူမရပါ",
  "No valid observations for this location and date range.": "ဤနေရာနှင့် ရက်အပိုင်းအခြားအတွက် အသုံးပြုနိုင်သော တိုင်းတာချက်မရှိပါ။",
  "NASA EARTH OBSERVATION": "NASA ကမ္ဘာမြေ စောင့်ကြည့်တိုင်းတာမှု",
  temperature: "အပူချိန်", precipitation: "မိုးရေချိန်", ndvi: "အပင်စိမ်းလန်းမှုညွှန်းကိန်း (NDVI)", environmental: "ပတ်ဝန်းကျင်",
  "environmental chart": "ပတ်ဝန်းကျင်ဆိုင်ရာ ဂရပ်",
  "Observations": "တိုင်းတာချက်များ", "Mean reference": "ပျမ်းမျှ ရည်ညွှန်းမျဉ်း", "Descriptive trend": "ဖော်ပြချက်ဆိုင်ရာ ပြောင်းလဲမှုလမ်းကြောင်း",
  "Marginal quality": "အရည်အသွေး အကန့်အသတ်ရှိ", "good": "အရည်အသွေးကောင်း", "marginal": "အရည်အသွေး အကန့်အသတ်ရှိ", "processed observation": "စီမံတွက်ချက်ထားသော တိုင်းတာချက်",
  "Min": "အနည်းဆုံး", "Max": "အများဆုံး", "Value": "တန်ဖိုး", "Unit": "ယူနစ်", "Date": "ရက်စွဲ",
  "Lines break at missing readings and gaps over three times the median observation interval. Reference lines summarize valid readings only.": "တိုင်းတာချက်ပျောက်နေသည့် နေရာများနှင့် ပုံမှန်အချိန်ခြား၏ အလယ်ကိန်းထက် သုံးဆကျော်ကွာသည့် နေရာများတွင် မျဉ်းကို ဖြတ်ထားသည်။ ရည်ညွှန်းမျဉ်းများသည် အသုံးပြုနိုင်သော တိုင်းတာချက်များကိုသာ အနှစ်ချုပ်ထားသည်။",
  "Loading Data and Trend Insight…": "အချက်အလက်နှင့် လမ်းကြောင်းသုံးသပ်ချက်ကို ရယူနေသည်…",
  "Unable to load insight": "သုံးသပ်ချက် ရယူမရပါ",
  "Data and Trend Insight will appear when analysis is available.": "တွက်ချက်မှုရရှိပါက အချက်အလက်နှင့် လမ်းကြောင်းသုံးသပ်ချက် ပေါ်လာပါမည်။",
  "Data and Trend Insight": "အချက်အလက်နှင့် လမ်းကြောင်းသုံးသပ်ချက်",
  "ENVIRONMENTAL INTELLIGENCE": "ပတ်ဝန်းကျင်ဆိုင်ရာ သုံးသပ်ချက်",
  "Measured observations, descriptive calculations, and scientific limitations for this analysis window.": "ဤသုံးသပ်ကာလအတွက် တိုင်းတာချက်များ၊ ဖော်ပြချက်ဆိုင်ရာ တွက်ချက်မှုများနှင့် သိပ္ပံနည်းကျ ကန့်သတ်ချက်များ။",
  "Location": "တည်နေရာ", "Coordinates": "ကိုဩဒိနိတ်", "Requested range": "တောင်းဆိုထားသော ကာလ", "Actual data": "အမှန်တကယ်ရရှိသော ကာလ", "Spatial selection": "နေရာရွေးချယ်မှု",
  "Key Environmental Statistics": "အဓိက ပတ်ဝန်းကျင်ကိန်းဂဏန်းများ", "Trend Summary": "ပြောင်းလဲမှုလမ်းကြောင်း အနှစ်ချုပ်", "Rate": "ပြောင်းလဲနှုန်း", "Analysis period": "သုံးသပ်ကာလ", "Valid observations": "အသုံးပြုနိုင်သော တိုင်းတာချက်များ",
  "Mean value": "ပျမ်းမျှတန်ဖိုး", "Variability (SD)": "ကွဲပြားမှု (SD)", "Minimum": "အနည်းဆုံး", "Maximum": "အများဆုံး", "Rejected / missing": "ပယ်ဖျက် / ပျောက်နေသော တိုင်းတာချက်",
  "Significance": "စာရင်းအင်းအရ ထင်ရှားမှု", "Method": "နည်းလမ်း", "Coverage": "အချက်အလက် လွှမ်းခြုံမှု", "Trend direction": "ပြောင်းလဲမှု ဦးတည်ချက်", "Valid / expected observations": "အသုံးပြုနိုင် / မျှော်မှန်း တိုင်းတာချက်များ", "Monthly means used": "အသုံးပြုထားသော လစဉ်ပျမ်းမျှများ", "Missing calendar months": "ပျောက်နေသော ပြက္ခဒိန်လများ", "Seasonal coverage": "ရာသီအလိုက် လွှမ်းခြုံမှု", "Sen's slope": "Sen လျှောစောက်", "P-value": "P တန်ဖိုး", "95% slope interval": "လျှောစောက်၏ 95% ကြားကာလ", "Interval method": "ကြားကာလတွက်နည်း", "Autocorrelation": "အချိန်ဆက်စပ်မှု", "Seasonal handling": "ရာသီအလိုက် ကိုင်တွယ်မှု", "Autocorrelation handling": "အချိန်ဆက်စပ်မှု ကိုင်တွယ်ခြင်း",
  "The slope interval describes uncertainty in the estimated yearly trend. It is not a forecast range.": "လျှောစောက်ကြားကာလသည် ခန့်မှန်းထားသော နှစ်စဉ်ပြောင်းလဲမှု၏ မသေချာမှုကို ဖော်ပြသည်။ အနာဂတ်ခန့်မှန်းချက် အပိုင်းအခြားမဟုတ်ပါ။",
  "Data Sources": "အချက်အလက် ရင်းမြစ်များ", "Notes and Limitations": "မှတ်ချက်များနှင့် ကန့်သတ်ချက်များ", "Processing notes": "စီမံတွက်ချက်မှု မှတ်ချက်များ", "No additional processing notes available.": "ထပ်မံဖော်ပြထားသော စီမံတွက်ချက်မှု မှတ်ချက်မရှိပါ။",
  "Dataset": "ဒေတာအစု", "Dataset ID": "ဒေတာအစု ID", "Provider": "ပံ့ပိုးသူ", "Satellite / instrument": "ဂြိုဟ်တု / ကိရိယာ", "Spatial resolution": "နေရာဆိုင်ရာ အသေးစိတ်ခွဲခြားနိုင်မှု", "Temporal frequency": "အချိန်အလိုက် အကြိမ်နှုန်း", "Actual observations": "အမှန်တကယ် တိုင်းတာကာလ", "QA policy": "အရည်အသွေးစစ်ဆေးမှု မူဝါဒ", "Valid / rejected": "အသုံးပြုနိုင် / ပယ်ဖျက်",
  "Not available": "မရရှိပါ", "not available": "မရရှိပါ", "Unavailable": "မရရှိပါ", "unavailable": "မရရှိပါ", "None": "မရှိပါ", "Selected location": "ရွေးချယ်ထားသော နေရာ", "Provided by host website": "ဝဘ်ဆိုက်မှ ပံ့ပိုးထားသည်", "representative-point": "ကိုယ်စားပြု အမှတ်တစ်နေရာ", "polygon-mean": "နယ်နိမိတ်အတွင်း ပျမ်းမျှ",
  "Increasing descriptive pattern": "တိုးလာသော ဖော်ပြချက်ဆိုင်ရာ ပုံစံ", "Decreasing descriptive pattern": "လျော့လာသော ဖော်ပြချက်ဆိုင်ရာ ပုံစံ", "Insufficient data": "အချက်အလက် မလုံလောက်ပါ", "No clear descriptive direction": "ရှင်းလင်းသော ပြောင်းလဲမှု ဦးတည်ချက်မရှိပါ", "increasing": "တိုးလာသော", "decreasing": "လျော့လာသော", "no clear trend": "ရှင်းလင်းသော ပြောင်းလဲမှုလမ်းကြောင်းမရှိ",
  "This describes the change between the first and last valid observations. It is not a statistically significant trend test and does not establish causation.": "ဤတန်ဖိုးသည် ပထမနှင့် နောက်ဆုံး အသုံးပြုနိုင်သော တိုင်းတာချက်တို့ကြား ပြောင်းလဲမှုကို ဖော်ပြသည်။ စာရင်းအင်းအရ ထင်ရှားမှုစမ်းသပ်ချက်မဟုတ်သကဲ့သို့ အကြောင်းရင်းကိုလည်း အတည်မပြုနိုင်ပါ။",
  "There are not enough valid observations to describe a change.": "ပြောင်းလဲမှုဖော်ပြရန် အသုံးပြုနိုင်သော တိုင်းတာချက် မလုံလောက်ပါ။",
  "Missing observations are excluded from statistics and remain silent during playback.": "ပျောက်နေသော တိုင်းတာချက်များကို စာရင်းအင်းတွက်ချက်မှုတွင် ဖယ်ထားပြီး အသံဖွင့်ချိန်တွင် အသံမထွက်ပါ။",
  "Dates retain their elapsed-time spacing. Descriptive calculations are not forecasts.": "ရက်စွဲများကို အမှန်တကယ်အချိန်ခြားအတိုင်း ပြထားသည်။ ဖော်ပြချက်ဆိုင်ရာ တွက်ချက်မှုများသည် အနာဂတ်ခန့်မှန်းချက်များ မဟုတ်ပါ။",
  "Source metadata is shown as supplied.": "ရင်းမြစ်ဆိုင်ရာ အသေးစိတ်အချက်အလက်ကို မူရင်းအတိုင်း ဖော်ပြထားသည်။",
  "Statistical significance requires sufficient observations, seasonal coverage, and quality metadata.": "စာရင်းအင်းအရ ထင်ရှားမှုတွက်ရန် လုံလောက်သော တိုင်းတာချက်များ၊ ရာသီအလိုက် လွှမ်းခြုံမှုနှင့် အရည်အသွေးအချက်အလက် လိုအပ်သည်။",
  "Statistical significance is currently implemented only for NASA POWER temperature.": "လက်ရှိတွင် NASA POWER အပူချိန်အတွက်သာ စာရင်းအင်းအရ ထင်ရှားမှု တွက်ချက်နိုင်သည်။",
  "At least two valid observations are required.": "အသုံးပြုနိုင်သော တိုင်းတာချက် အနည်းဆုံး နှစ်ခု လိုအပ်သည်။",
  "At least 3 years and 24 monthly means are required for seasonal inference.": "ရာသီအလိုက် ကောက်ချက်ချရန် အနည်းဆုံး 3 နှစ်နှင့် လစဉ်ပျမ်းမျှ 24 ခု လိုအပ်သည်။",
  "The selected period crosses the known 2008 change in NASA POWER data for Myanmar. Choose a period from 2009 onward for this calculation.": "ရွေးချယ်ထားသော ကာလသည် မြန်မာနိုင်ငံအတွက် NASA POWER ဒေတာ၏ 2008 ခုနှစ် ပြောင်းလဲမှုကို ဖြတ်ကျော်နေသည်။ ဤတွက်ချက်မှုအတွက် 2009 ခုနှစ်မှစသော ကာလကို ရွေးပါ။",
  "At least ten calendar months and 80% of the expected monthly calendar must have usable observations.": "အနည်းဆုံး ပြက္ခဒိန်လ ဆယ်မျိုးနှင့် မျှော်မှန်းလများ၏ 80% တွင် အသုံးပြုနိုင်သော တိုင်းတာချက် ရှိရမည်။",
  "Inferential results are unavailable because material serial autocorrelation was detected; a validated dependence-aware method is required.": "သိသာသော အချိန်ဆက်စပ်မှု တွေ့ရှိရသဖြင့် ကောက်ချက်ဆိုင်ရာ ရလဒ်များ မပေးနိုင်ပါ။ ဆက်စပ်မှုကို ထည့်သွင်းတွက်ချက်သည့် အတည်ပြုထားသော နည်းလမ်း လိုအပ်သည်။",
  "Experimental significance estimate": "စမ်းသပ်ဆဲ ထင်ရှားမှု ခန့်မှန်းချက်",
  "Seasonal Mann–Kendall with seasonal Sen’s slope (experimental)": "ရာသီအလိုက် Mann–Kendall နှင့် Sen လျှောစောက် (စမ်းသပ်ဆဲ)",
  "Seasonal Mann–Kendall with seasonal tie correction and seasonal Sen's slope; inference limited to low-autocorrelation series.": "ရာသီအလိုက် တန်ဖိုးတူညှိနှိုင်းထားသော Mann–Kendall နှင့် Sen လျှောစောက်။ အချိန်ဆက်စပ်မှုနည်းသော စီးရီးများအတွက်သာ ကောက်ချက်ချသည်။",
  "Daily months need at least 90% of calendar days. Monthly means are compared only with the same calendar month in other years.": "နေ့စဉ်ဒေတာတွင် လတစ်လ၏ ပြက္ခဒိန်ရက် အနည်းဆုံး 90% လိုအပ်သည်။ လစဉ်ပျမ်းမျှများကို အခြားနှစ်များရှိ တူညီသော ပြက္ခဒိန်လနှင့်သာ နှိုင်းယှဉ်သည်။",
  "Conservative screen: results are withheld when absolute lag-1 correlation of monthly values exceeds 0.1. This check can also flag seasonality or trend; passing it does not prove independence. P-values and intervals assume independent observations.": "သတိထားစစ်ဆေးမှုအနေဖြင့် လစဉ်တန်ဖိုးများ၏ lag-1 ဆက်စပ်မှု ပကတိတန်ဖိုး 0.1 ကျော်ပါက ရလဒ်ကို မဖော်ပြပါ။ ရာသီနှင့် လမ်းကြောင်းကြောင့်လည်း ဤစစ်ဆေးမှု မအောင်နိုင်ပါ။ အောင်မြင်ခြင်းက သီးခြားလွတ်လပ်မှုကို အတည်မပြုပါ။ P တန်ဖိုးနှင့် ကြားကာလများသည် တိုင်းတာချက်များ သီးခြားလွတ်လပ်သည်ဟု ယူဆထားသည်။",
  "Approximate 95% Gilbert rank interval for seasonal Sen's slope; assumes independent observations after the screening checks.": "ရာသီအလိုက် Sen လျှောစောက်အတွက် ခန့်မှန်း 95% Gilbert အဆင့်ကြားကာလ။ စစ်ဆေးမှုများပြီးနောက် တိုင်းတာချက်များ သီးခြားလွတ်လပ်သည်ဟု ယူဆထားသည်။",
  "There are too few pairwise slopes to bound the requested interval.": "တောင်းဆိုထားသော ကြားကာလသတ်မှတ်ရန် အတွဲလိုက် လျှောစောက်များ မလုံလောက်ပါ။",
  "Not enough supported observations to estimate an interval": "ကြားကာလခန့်မှန်းရန် သင့်လျော်သော တိုင်းတာချက် မလုံလောက်ပါ",
  "Calculated only when the significance checks pass": "ထင်ရှားမှုစစ်ဆေးချက်များ အောင်မြင်မှသာ တွက်သည်",
  "The available observations do not provide evidence of a statistically significant seasonal monotonic trend at the 0.05 threshold.": "ရရှိသော တိုင်းတာချက်များတွင် 0.05 သတ်မှတ်ချက်အရ စာရင်းအင်းထင်ရှားသော ရာသီအလိုက် တစ်ဖက်တည်းပြောင်းလဲမှု အထောက်အထား မရှိပါ။",
};

export function chartText(lang: ChartLanguage, text: string): string {
  if (lang === "en") return text;
  if (my[text]) return my[text];
  if (Object.hasOwn(sharedCopy, text)) return sharedCopy[text as keyof typeof sharedCopy];
  const dataset = DATASETS.find(item => item.label === text);
  if (dataset) return indicatorName(dataset.id,text,lang);
  // Only format known model phrases; never translate or round scientific numbers.
  const period = text.match(/^(\d{4}-\d{2}-\d{2}|not available) to (\d{4}-\d{2}-\d{2}|not available)$/);
  if (period) return `${chartText(lang, period[1])} မှ ${chartText(lang, period[2])} အထိ`;
  const coverage = text.match(/^(\d+) valid of (\d+) returned observations$/);
  if (coverage) return `ရရှိသော တိုင်းတာချက် ${coverage[2]} ခုအနက် ${coverage[1]} ခု အသုံးပြုနိုင်သည်`;
  const valid = text.match(/^(\d+) valid observations$/);
  if (valid) return `အသုံးပြုနိုင်သော တိုင်းတာချက် ${valid[1]} ခု`;
  const rate = text.match(/^(.*)\/year \((?:endpoint rate|time-based fit); descriptive only\)$/);
  if (rate) return `${rate[1]}/နှစ် (အချိန်အလိုက် အံဝင်ခွင်ကျမျဉ်းဖြင့် တွက်ထားသော နှုန်း၊ ဖော်ပြချက်အတွက်သာ)`;
  const invalid = text.match(/^(Invalid observation date|Duplicate observation dates) cannot be used for inference: (.*)$/);
  if (invalid) return `${invalid[1].startsWith("Invalid") ? "မမှန်ကန်သော ရက်စွဲ" : "ထပ်နေသော ရက်စွဲများ"} ကို ကောက်ချက်ချရန် အသုံးမပြုနိုင်ပါ: ${invalid[2]}`;
  const significant = text.match(/^The seasonal test indicates a (increasing|decreasing|no clear trend) monotonic pattern at the 0.05 threshold; this describes the observed series and does not establish causation\.$/);
  if (significant) return `ရာသီအလိုက် စမ်းသပ်ချက်သည် 0.05 သတ်မှတ်ချက်အရ ${chartText(lang, significant[1])} တစ်ဖက်တည်းပြောင်းလဲမှုကို ဖော်ပြသည်။ တိုင်းတာထားသော စီးရီးကိုသာ ဖော်ပြပြီး အကြောင်းရင်းကို အတည်မပြုပါ။`;
  const rules: Array<[RegExp, (...values: string[]) => string]> = [
    [/^(.*) recorded (\d+) valid (.*) observations?\. Values changed by (.*) \((.*)\) from (.*) to (.*); this is a descriptive summary, not proof of causation or statistical significance\.$/, (name,n,unit,change,percent,start,end) => `${chartText(lang,name)} တွင် အသုံးပြုနိုင်သော ${unit} တိုင်းတာချက် ${n} ခု ရရှိသည်။ ${start} မှ ${end} အထိ ${change} (${percent}) ပြောင်းလဲသည်။ ဤအကျဉ်းချုပ်သည် အကြောင်းရင်း သို့မဟုတ် စာရင်းအင်းထင်ရှားမှုကို အတည်မပြုပါ။`],
    [/^Values are reported in (.*)\. Monthly summaries describe available observations; they are not accumulated totals or forecasts\.$/, unit => `တန်ဖိုးများ၏ ယူနစ်မှာ ${unit} ဖြစ်သည်။ လစဉ်အကျဉ်းချုပ်များသည် ရရှိသော တိုင်းတာချက်များကိုသာ ဖော်ပြသည်။ စုစုပေါင်းပမာဏ သို့မဟုတ် အနာဂတ်ခန့်မှန်းချက် မဟုတ်ပါ။`],
    [/^(\d+) of (\d+) requested days$/, (n,total) => `တောင်းဆိုထားသော ${total} ရက်အနက် ${n} ရက်`],
    [/^(.*) pooled mean from (\d+) supported years\.$/, (mean,n) => `အချက်အလက်လုံလောက်သော ${n} နှစ်မှ စုပေါင်းပျမ်းမျှ ${mean}`],
    [/^(.*) from (\d+) months and (\d+) observations\.$/, (mean,months,n) => `${months} လနှင့် တိုင်းတာချက် ${n} ခုမှ ပျမ်းမျှ ${mean}`],
    [/^Insufficient coverage \((\d+) months\)\.$/, n => `အချက်အလက် မလုံလောက်ပါ (${n} လ)`],
    [/^Months without returned observations: (.*)\.$/, months => `တိုင်းတာချက် မရရှိသော လများ — ${months}`],
    [/^(\d+) valid observations?$/, n => `အသုံးပြုနိုင်သော တိုင်းတာချက် ${n} ခု`],
    [/^(\d+) rejected or missing observations?\.$/, n => `ဖယ်ထုတ်ထားသော သို့မဟုတ် ပျောက်နေသော တိုင်းတာချက် ${n} ခု။`],
    [/^(\d+) endpoint observations from the valid series$/, n => `မှန်ကန်သော စီးရီး၏ အစနှင့်အဆုံး တိုင်းတာချက် ${n} ခု`],
    [/^Mean and sample standard deviation in (.*)$/, unit => `${unit} ဖြင့် ပျမ်းမျှနှင့် နမူနာစံသွေဖည်ချက်`],
    [/^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) (\d{4})$/, (month,year) => `${chartText(lang,month)} ${year}`],
    [/^Descriptive sample standard deviation comparison: early period (.*) to (.*) \((\d+) observations\) versus late period (.*) to (.*) \((\d+) observations\)\. It is not a significance test\.$/, (start,end,n,lstart,lend,ln) => `နမူနာစံသွေဖည်ချက်ကို နှိုင်းယှဉ်ထားသည်။ ကာလအစ ${start} မှ ${end} (တိုင်းတာချက် ${n} ခု) နှင့် ကာလအဆုံး ${lstart} မှ ${lend} (တိုင်းတာချက် ${ln} ခု) ဖြစ်သည်။ စာရင်းအင်းထင်ရှားမှု စမ်းသပ်ချက် မဟုတ်ပါ။`],
  ];
  for (const [pattern, format] of rules) { const match = text.match(pattern); if (match) return format(...match.slice(1)); }
  return text;
}
