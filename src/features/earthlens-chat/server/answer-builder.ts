import "server-only";
import type { Fact, Lang } from "../types";
import type { AnswerFormat, SectionId } from "../config/answer-format";
import type { Grounding } from "./grounding";
import type { Assessment } from "./climate/assessment";
import type { Recommendation } from "./recommendations";
import type { ValidatedOutlook } from "./forecast/validated-outlook";
import { POWER_SOURCE } from "./nasa/power";

/** Builds the fixed six-section answer. Only section 3 (impacts) may contain AI-written text. */

type T = Record<Lang, string>;
const UNIT_MY: Record<string, string> = { days: "ရက်", detections: "ကြိမ်", years: "နှစ်", percentile: "(ရာခိုင်နှုန်းအဆင့်)", "fraction (0–1)": "အချိုး (0–1)" };

const when = (f: Fact, lang: Lang) =>
  f.date ? f.date : f.period ? (lang === "my" ? `${f.period.start} မှ ${f.period.end}` : `${f.period.start} to ${f.period.end}`) : "";

export function factText(f: Fact, lang: Lang, fmt: AnswerFormat): string {
  const label = lang === "my" ? f.labelMy : f.label;
  const u = lang === "my" ? (UNIT_MY[f.unit] ?? f.unit) : f.unit;
  // the label already says "(percentile)", so no unit is printed for percentiles
  const unit = fmt.showUnits && f.unit !== "percentile" ? ` ${u}` : "";
  const date = fmt.showDates && when(f, lang) ? ` (${when(f, lang)})` : "";
  return `${label}: ${f.value.toFixed(f.decimals)}${unit}${date}`;
}

const STATUS: Record<string, T> = {
  "drought:none": { en: "no drought signal", my: "မိုးခေါင်မှု အချက်ပြမှု မရှိ" },
  "drought:watch": { en: "WATCH — drier than usual", my: "စောင့်ကြည့်ရန် — ပုံမှန်ထက် ခြောက်သွေ့" },
  "drought:warning": { en: "WARNING — much drier than usual", my: "သတိပေး — ပုံမှန်ထက် အလွန်ခြောက်သွေ့" },
  "drought:unknown": { en: "not available", my: "မရရှိနိုင်" },
  "wet:none": { en: "no unusual wet signal", my: "ပုံမှန်မဟုတ်သော စိုစွတ်မှု မရှိ" },
  "wet:watch": { en: "WATCH — unusually wet / heavy rain", my: "စောင့်ကြည့်ရန် — ပုံမှန်ထက် စိုစွတ် / မိုးပြင်း" },
  "wet:unknown": { en: "not available", my: "မရရှိနိုင်" },
  "heat:none": { en: "temperatures within the usual range", my: "အပူချိန် ပုံမှန်အတိုင်းအတာအတွင်း" },
  "heat:unusual": { en: "UNUSUALLY HOT for this season", my: "ဤရာသီအတွက် ပုံမှန်ထက် အလွန်ပူ" },
  "heat:unknown": { en: "not available", my: "မရရှိနိုင်" },
};

export interface BuildInput {
  lang: Lang;
  fmt: AnswerFormat;
  g: Grounding;
  a: Assessment;
  recs: Recommendation[];
  outlook: ValidatedOutlook | null;
  aiImpacts: string | null;
  limitations: string[];
}

function heading(fmt: AnswerFormat, id: SectionId, lang: Lang): string {
  const i = fmt.sections.findIndex((s) => s.id === id);
  const h = fmt.sections[i].heading[lang];
  return fmt.numberHeadings ? `${i + 1}. ${h}` : h;
}

function current({ lang, fmt, g, a }: BuildInput): string[] {
  const L = (t: T) => t[lang];
  const out: string[] = [];
  const name = lang === "my" ? g.region.nameMy : g.region.name;
  if (!g.facts.length && !a.available) {
    out.push(L({ en: `NASA measurements for ${name} could not be retrieved right now. Please try again later.`, my: `${name} အတွက် NASA တိုင်းတာချက်များကို ယခု မရယူနိုင်ပါ။ ခဏကြာမှ ထပ်မံ ကြိုးစားပါ။` }));
    return out;
  }
  out.push(L({ en: `NASA observations for ${name} (one representative grid point):`, my: `${name} အတွက် NASA တိုင်းတာချက်များ (ကိုယ်စားပြု ဂရစ်အမှတ် တစ်ခု) -` }));
  for (const f of g.facts) out.push(`• ${factText(f, lang, fmt)}`);
  for (const f of a.facts.filter((x) => x.kind === "observation")) out.push(`• ${factText(f, lang, fmt)}`);
  const ctx = a.facts.filter((f) => f.kind === "comparison");
  if (ctx.length) {
    out.push(L({ en: "Compared with the same dates in past years (percentile: 50 = typical, below 20 = unusually low, above 80 = unusually high):", my: "ယခင်နှစ်များ၏ တူညီသောရက်များနှင့် နှိုင်းယှဉ်ချက် (ရာခိုင်နှုန်းအဆင့် - ၅၀ = ပုံမှန်၊ ၂၀ အောက် = ပုံမှန်ထက် အလွန်နည်း၊ ၈၀ အထက် = ပုံမှန်ထက် အလွန်များ) -" }));
    for (const f of ctx) out.push(`• ${factText(f, lang, fmt)}`);
  }
  if (a.drySeasonNow) out.push(L({ en: "• The last 30 days fall in the usual dry season here, so a rainfall ranking is not meaningful.", my: "• ပြီးခဲ့သော ရက် ၃၀ သည် ဤနေရာ၏ ပုံမှန် ခြောက်သွေ့ရာသီ ဖြစ်သဖြင့် မိုးရေချိန် အဆင့်သတ်မှတ်ချက်သည် အဓိပ္ပာယ် မရှိပါ။" }));
  out.push(L({ en: "EarthLens indicators (not official declarations):", my: "EarthLens ညွှန်ကိန်းများ (တရားဝင် ကြေညာချက်များ မဟုတ်ပါ) -" }));
  out.push(`• ${L({ en: "Drought", my: "မိုးခေါင်မှု" })}: ${L(STATUS[`drought:${a.drought}`])}`);
  out.push(`• ${L({ en: "Wet conditions / flood risk from rainfall", my: "စိုစွတ်မှု / မိုးကြောင့် ရေကြီးနိုင်ခြေ" })}: ${L(STATUS[`wet:${a.wet}`])}`);
  out.push(`• ${L({ en: "Heat", my: "အပူ" })}: ${L(STATUS[`heat:${a.heat}`])}`);
  return out;
}

function outlookSection({ lang, fmt, a, outlook }: BuildInput): string[] {
  const L = (t: T) => t[lang];
  const out: string[] = [];
  const w = a.outlookWindow;
  const range = lang === "my" ? `${w.start} မှ ${w.end}` : `${w.start} to ${w.end}`;

  // (a) Forecast — only validated probabilities, otherwise an explicit statement.
  if (outlook && outlook.probabilities.length) {
    out.push(L({ en: `Forecast for ${range} (validated model):`, my: `${range} အတွက် ခန့်မှန်းချက် (အတည်ပြုထားသော မော်ဒယ်) -` }));
    for (const p of outlook.probabilities)
      out.push(`• ${p.event}: ${p.probability}% — ${p.model.name} ${p.model.version} (${p.validation.skillScoreName} ${p.validation.skillScore}, ${p.validation.hindcastPeriod})`);
  } else {
    out.push(
      L({
        en: `Forecast: a reliable 30-day forecast cannot be calculated yet. No forecasting model has been validated for this region, so no forecast or probability is shown for ${range}.`,
        my: `ခန့်မှန်းချက် - ယုံကြည်စိတ်ချရသော ရက် ၃၀ ခန့်မှန်းချက်ကို ယခု မတွက်ချက်နိုင်သေးပါ။ ဤဒေသအတွက် ခန့်မှန်းမော်ဒယ်ကို အတည်မပြုရသေးသဖြင့် ${range} အတွက် ခန့်မှန်းချက် သို့မဟုတ် ဖြစ်နိုင်ခြေ ရာခိုင်နှုန်း မပြပါ။`,
      }),
    );
  }

  // (b) Historical pattern — always labelled as NOT a forecast.
  const hist = a.facts.filter((f) => f.kind === "historical" && f.id !== "heavy_threshold");
  if (hist.length) {
    const years = a.facts.find((f) => f.id === "hist_years");
    const span = a.baseline ? `${a.baseline.firstYear}–${a.baseline.lastYear}` : "";
    out.push("");
    out.push(
      L({
        en: `Historical pattern for the same calendar dates (NOT a forecast — what happened in ${years ? years.value : "past"} past years, ${span}):`,
        my: `တူညီသော ပြက္ခဒိန်ရက်များအတွက် ယခင်နှစ်များ၏ ပုံစံ (ခန့်မှန်းချက် မဟုတ်ပါ — ${span} ကာလ ယခင်နှစ် ${years ? years.value : ""} နှစ်တွင် ဖြစ်ခဲ့သည်များ) -`,
      }),
    );
    for (const f of hist.filter((x) => x.id !== "hist_years")) out.push(`• ${factText(f, lang, fmt)}`);
    const thr = a.facts.find((f) => f.id === "heavy_threshold");
    if (thr) out.push(`• ${factText(thr, lang, fmt)}`);
  }

  // (c) What the pattern means for drought, flood and agriculture — wording only, no new numbers.
  out.push("");
  if (a.drySeasonAhead)
    out.push(L({ en: "• Drought: this period is normally dry here, so little rain would be usual and is not by itself a new drought signal.", my: "• မိုးခေါင်မှု - ဤကာလသည် ဤနေရာတွင် ပုံမှန်အားဖြင့် ခြောက်သွေ့သဖြင့် မိုးနည်းခြင်းသည် ပုံမှန်ဖြစ်ပြီး မိုးခေါင်မှု အချက်ပြမှုအသစ် မဟုတ်ပါ။" }));
  else if (a.drought === "watch" || a.drought === "warning")
    out.push(L({ en: "• Drought: soils are already drier than usual; past years cannot tell whether the coming rain will be enough to recover.", my: "• မိုးခေါင်မှု - မြေဆီလွှာသည် ပုံမှန်ထက် ခြောက်သွေ့နေပြီ ဖြစ်ပြီး လာမည့် မိုးရေသည် ပြန်လည်ကောင်းမွန်ရန် လုံလောက်မလား ယခင်နှစ်များမှ မသိနိုင်ပါ။" }));
  if (a.soilSeasonalChange)
    out.push(
      L({
        en: `• Soil moisture: in past years, root-zone soil usually ${a.soilSeasonalChange === "wetter" ? "became wetter" : a.soilSeasonalChange === "drier" ? "became drier" : "stayed about the same"} over these 30 days.`,
        my: `• မြေစိုစွတ်မှု - ယခင်နှစ်များတွင် ဤရက် ၃၀ အတွင်း မြေဆီလွှာသည် ပုံမှန်အားဖြင့် ${a.soilSeasonalChange === "wetter" ? "ပိုစိုစွတ်လာခဲ့သည်" : a.soilSeasonalChange === "drier" ? "ပိုခြောက်သွေ့လာခဲ့သည်" : "ပြောင်းလဲမှု သိပ်မရှိခဲ့ပါ"}။`,
      }),
    );
  out.push(L({ en: "• Flood: river levels and flood forecasts (e.g. GloFAS) are not integrated yet; only rainfall-based history is shown.", my: "• ရေကြီးမှု - မြစ်ရေမျက်နှာပြင်နှင့် ရေကြီးမှု ခန့်မှန်းချက်များ (ဥပမာ GloFAS) မထည့်သွင်းရသေးပါ။ မိုးရေချိန်အပေါ် အခြေခံသော ယခင်ပုံစံကိုသာ ပြထားပါသည်။" }));
  out.push(L({ en: "• Agriculture: use the past-year range as a planning guide only; this year can fall outside it.", my: "• စိုက်ပျိုးရေး - ယခင်နှစ်များ၏ အတိုင်းအတာကို စီစဉ်ရန် လမ်းညွှန်အဖြစ်သာ အသုံးပြုပါ။ ယခုနှစ်သည် ထိုအတိုင်းအတာ ပြင်ပ ဖြစ်နိုင်ပါသည်။" }));
  return out;
}

export function templateImpacts(a: Assessment, lang: Lang): string {
  const L = (t: T) => t[lang];
  const out: string[] = [];
  if (a.drought === "watch" || a.drought === "warning")
    out.push(L({ en: "• Lower soil moisture can stress rain-fed crops and reduce water in ponds, wells and small reservoirs.", my: "• မြေစိုစွတ်မှု နည်းခြင်းကြောင့် မိုးရေကိုသာ မှီခိုသော သီးနှံများ ဒဏ်ခံရနိုင်ပြီး ကန်၊ ရေတွင်းနှင့် ရေလှောင်ကန်ငယ်များ၏ ရေ လျော့နည်းနိုင်ပါသည်။" }));
  if (a.wet === "watch")
    out.push(L({ en: "• Saturated soils and heavy rain can cause waterlogging, local flooding of fields and damage to stored harvest.", my: "• မြေဆီလွှာ ရေဝနေခြင်းနှင့် မိုးပြင်းထန်ခြင်းကြောင့် ရေဝပ်ခြင်း၊ လယ်ကွင်းများ ရေလွှမ်းခြင်းနှင့် သိုလှောင်ထားသော သီးနှံ ပျက်စီးခြင်း ဖြစ်နိုင်ပါသည်။" }));
  if (a.heat === "unusual")
    out.push(L({ en: "• Unusual heat can stress crops and livestock and increase water demand.", my: "• ပုံမှန်မဟုတ်သော အပူသည် သီးနှံနှင့် တိရစ္ဆာန်များကို ဒဏ်ခံစေပြီး ရေလိုအပ်ချက်ကို တိုးစေနိုင်ပါသည်။" }));
  if (a.drySeasonAhead)
    out.push(L({ en: "• With the usual dry period ahead, crops without irrigation will depend on the soil moisture that remains.", my: "• ပုံမှန် ခြောက်သွေ့ကာလ ရှေ့တွင် ရှိသဖြင့် ဆည်မြောင်းရေ မရသော သီးနှံများသည် ကျန်ရှိသော မြေစိုစွတ်မှုကိုသာ မှီခိုရပါမည်။" }));
  if (!out.length)
    out.push(L({ en: "• The NASA data shows no unusual drought, wet or heat signal right now, so no specific impact is indicated.", my: "• NASA အချက်အလက်တွင် ယခုအချိန်၌ ပုံမှန်မဟုတ်သော မိုးခေါင်မှု၊ စိုစွတ်မှု သို့မဟုတ် အပူ အချက်ပြမှု မတွေ့ရသဖြင့် သီးခြား သက်ရောက်မှု မညွှန်ပြပါ။" }));
  return out.join("\n");
}

function decision({ lang, fmt, recs }: BuildInput): string[] {
  const out: string[] = [];
  if (fmt.decisionSupportStatus) out.push(fmt.decisionSupportStatus[lang]);
  recs.forEach((r, i) => {
    out.push(`(${i + 1}) ${r.text}`);
    out.push(`   ${r.reason}`);
    if (r.uncertainty) out.push(`   ${lang === "my" ? "မသေချာမှု" : "Uncertainty"}: ${r.uncertainty}`);
  });
  return out;
}

function sourcesSection({ lang, fmt, g, a, outlook }: BuildInput): string[] {
  const L = (t: T) => t[lang];
  const out: string[] = [];
  const link = (u: string) => (fmt.showSourceLinks ? ` — ${u}` : "");
  const sources = [...g.sources];
  if (a.available && !sources.some((s) => s.id === POWER_SOURCE.id)) sources.push(POWER_SOURCE);
  for (const s of sources) out.push(`• ${s.name}${link(s.url)}`);
  if (sources.some((s) => s.id === POWER_SOURCE.id))
    out.push(L({ en: "  NASA POWER daily meteorology comes from NASA GMAO MERRA-2 (from 1981) and GEOS FP-IT (near real time, about 2 days behind).", my: "  NASA POWER နေ့စဉ် မိုးလေဝသ အချက်အလက်များသည် NASA GMAO MERRA-2 (၁၉၈၁ မှစ၍) နှင့် GEOS FP-IT (အချိန်နှင့်တပြေးညီနီးပါး၊ ၂ ရက်ခန့် နောက်ကျ) မှ ဖြစ်ပါသည်။" }));
  if (g.period) out.push(L({ en: `  Recent observation window: ${g.period.start} to ${g.period.end}.`, my: `  မကြာသေးမီ တိုင်းတာကာလ - ${g.period.start} မှ ${g.period.end}။` }));
  if (a.latestDate && a.baseline)
    out.push(L({ en: `  Long-term comparison: ${a.baseline.firstYear}–${a.baseline.lastYear}, latest data day ${a.latestDate}.`, my: `  ရေရှည် နှိုင်းယှဉ်ကာလ - ${a.baseline.firstYear}–${a.baseline.lastYear}၊ နောက်ဆုံး အချက်အလက်ရက် ${a.latestDate}။` }));
  out.push(L({ en: "• NASA POWER data access and documentation: https://power.larc.nasa.gov/", my: "• NASA POWER အချက်အလက် ရယူရန်နှင့် စာတမ်းများ - https://power.larc.nasa.gov/" }));
  if (outlook?.probabilities.length) {
    for (const p of outlook.probabilities)
      out.push(`• ${p.model.name} ${p.model.version} (${p.model.issued})${link(p.model.url)} — ${p.validation.skillScoreName} ${p.validation.skillScore}, ROC ${p.validation.rocArea}, ${p.validation.hindcastPeriod}${p.validation.reportUrl ? ` — ${p.validation.reportUrl}` : ""}`);
  } else {
    out.push(L({ en: "• Forecasting model: none (no model has passed validation yet). Validation information: not applicable.", my: "• ခန့်မှန်းမော်ဒယ် - မရှိပါ (အတည်ပြုစစ်ဆေးမှု အောင်မြင်သော မော်ဒယ် မရှိသေးပါ)။ အတည်ပြုချက် အချက်အလက် - မသက်ဆိုင်ပါ။" }));
  }
  out.push(L({ en: "• Indicator rules (drought, wet, heat) are EarthLens definitions documented in the project README.", my: "• ညွှန်ကိန်း စည်းမျဉ်းများ (မိုးခေါင်မှု၊ စိုစွတ်မှု၊ အပူ) သည် project README တွင် ဖော်ပြထားသော EarthLens သတ်မှတ်ချက်များ ဖြစ်ပါသည်။" }));
  return out;
}

function disclaimer({ lang, fmt, outlook, limitations, g }: BuildInput): string[] {
  const out = [fmt.disclaimer[lang]];
  if (!outlook?.probabilities.length) out.push(fmt.noModelNote[lang]);
  const notes = [...limitations, ...g.notes];
  if (notes.length) for (const n of notes) out.push(`• ${n}`);
  return out;
}

export function buildAnswer(input: BuildInput): { text: string; sections: Record<SectionId, string> } {
  const { lang, fmt } = input;
  const bodies: Record<SectionId, string[]> = {
    current: current(input),
    outlook: outlookSection(input),
    impacts: [input.aiImpacts ?? templateImpacts(input.a, lang)],
    decision: decision(input),
    sources: sourcesSection(input),
    disclaimer: disclaimer(input),
  };
  const sections = {} as Record<SectionId, string>;
  const parts: string[] = [];
  for (const s of fmt.sections) {
    const body = bodies[s.id].join("\n");
    sections[s.id] = body;
    parts.push(`${heading(fmt, s.id, lang)}\n${body}`);
  }
  return { text: parts.join("\n\n"), sections };
}
