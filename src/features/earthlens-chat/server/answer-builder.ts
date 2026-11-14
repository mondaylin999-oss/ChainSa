import "server-only";
import type { ActionCard, DataTable, Fact, Lang, SummaryParts } from "../types";
import type { AnswerFormat, SectionId } from "../config/answer-format";
import type { Grounding } from "./grounding";
import type { Assessment } from "./climate/assessment";
import type { ValidatedOutlook } from "./forecast/validated-outlook";
import { POWER_SOURCE } from "./nasa/power";
import { cardsText, tableText } from "./presentation";

/**
 * Builds the answer: an Executive Summary on top, then "Detailed Analysis" with six numbered sections:
 *   1 Current NASA Data (table) · 2 Historical Comparison · 3 Next 30-Day Outlook ·
 *   4 Evidence-Based Action Cards · 5 Data Sources · 6 Disclaimer (always last).
 * Only the summary's first sentence may be AI-written. Every other summary sentence is taken from the table and
 * the Action Cards, so the summary can never say something the detailed sections do not.
 */

type T = Record<Lang, string>;
const UNIT_MY: Record<string, string> = { days: "ရက်", detections: "ကြိမ်", years: "နှစ်", percentile: "(ရာခိုင်နှုန်းအဆင့်)", "fraction (0–1)": "အချိုး (0–1)" };

const when = (f: Fact, lang: Lang) =>
  f.date ? f.date : f.period ? (lang === "my" ? `${f.period.start} မှ ${f.period.end}` : `${f.period.start} to ${f.period.end}`) : "";

export function factText(f: Fact, lang: Lang, fmt: AnswerFormat): string {
  const label = lang === "my" ? f.labelMy : f.label;
  const u = lang === "my" ? (UNIT_MY[f.unit] ?? f.unit) : f.unit;
  const unit = fmt.showUnits && f.unit !== "percentile" ? ` ${u}` : "";
  const date = fmt.showDates && when(f, lang) ? ` (${when(f, lang)})` : "";
  return `${label}: ${f.value.toFixed(f.decimals)}${unit}${date}`;
}

export interface BuildInput {
  lang: Lang;
  fmt: AnswerFormat;
  g: Grounding;
  a: Assessment;
  outlook: ValidatedOutlook | null;
  /** AI-written direct answer (1–3 sentences), or null to use the template. */
  aiDirect: string | null;
  topics: ("drought" | "flood" | "agriculture")[];
  limitations: string[];
  table: DataTable | null;
  cards: ActionCard[];
  cardNote: string | null;
  /** Where the region came from: named in the question, or selected on the map. */
  regionSource: "question" | "map";
  /** Region selected on the map when the question names a different one. */
  mapRegionName?: string | null;
}

/** The summary has no number; the detailed sections are numbered 1–6. */
export function sectionNumber(fmt: AnswerFormat, id: SectionId): number | null {
  if (id === "summary") return null;
  return fmt.sections.filter((s) => s.id !== "summary").findIndex((s) => s.id === id) + 1;
}

function heading(fmt: AnswerFormat, id: SectionId, lang: Lang): string {
  const h = fmt.sections.find((s) => s.id === id)!.heading[lang];
  const n = sectionNumber(fmt, id);
  return fmt.numberHeadings && n ? `${n}. ${h}` : h;
}

const PHRASE: Record<string, T> = {
  "drought:none": { en: "NASA data shows no drought signal", my: "NASA အချက်အလက်တွင် မိုးခေါင်မှု အချက်ပြမှု မတွေ့ရပါ" },
  "drought:watch": { en: "conditions are drier than usual for this time of year (drought watch)", my: "ယခုအချိန်အတွက် ပုံမှန်ထက် ခြောက်သွေ့နေပါသည် (မိုးခေါင်မှု စောင့်ကြည့်)" },
  "drought:warning": { en: "conditions are much drier than usual (drought warning)", my: "ပုံမှန်ထက် အလွန်ခြောက်သွေ့နေပါသည် (မိုးခေါင်မှု သတိပေး)" },
  "wet:none": { en: "there is no unusual heavy-rain or wet signal", my: "ပုံမှန်မဟုတ်သော မိုးသည်းမှု သို့မဟုတ် စိုစွတ်မှု မတွေ့ရပါ" },
  "wet:watch": { en: "it has been unusually wet, so rain-related flooding needs watching", my: "ပုံမှန်ထက် စိုစွတ်နေသဖြင့် မိုးကြောင့် ရေကြီးနိုင်မှုကို စောင့်ကြည့်ရန် လိုပါသည်" },
  "heat:unusual": { en: "it has been unusually hot for the season", my: "ဤရာသီအတွက် ပုံမှန်ထက် ပူနေပါသည်" },
};

/** Rule-based direct answer used when no AI text is available. */
export function templateDirect({ lang, g, a, topics }: BuildInput): string {
  const L = (t: T) => t[lang];
  const name = lang === "my" ? g.region.nameMy : g.region.name;
  if (!g.facts.length && !a.available)
    return L({ en: `I could not retrieve NASA data for ${name} right now, so I cannot answer reliably. Please try again later.`, my: `${name} အတွက် NASA အချက်အလက်ကို ယခု မရယူနိုင်သဖြင့် ယုံကြည်စိတ်ချစွာ မဖြေနိုင်ပါ။ ခဏကြာမှ ထပ်ကြိုးစားပါ။` });
  const parts: string[] = [];
  if (topics.includes("drought") || topics.includes("agriculture")) parts.push(L(PHRASE[`drought:${a.drought}`] ?? PHRASE["drought:none"]));
  if (topics.includes("flood") || a.wet === "watch") parts.push(L(PHRASE[`wet:${a.wet}`] ?? PHRASE["wet:none"]));
  if (a.heat === "unusual") parts.push(L(PHRASE["heat:unusual"]));
  const joined = parts.join(lang === "my" ? "၊ " : "; ");
  return L({ en: `For ${name}: ${joined || "no unusual conditions are indicated"}.`, my: `${name} အတွက် - ${joined || "ပုံမှန်မဟုတ်သော အခြေအနေ မညွှန်ပြပါ"}။` });
}

function current({ lang, g, a, table }: BuildInput): string[] {
  const L = (t: T) => t[lang];
  const name = lang === "my" ? g.region.nameMy : g.region.name;
  if (!g.facts.length && !a.available)
    return [L({ en: `NASA measurements for ${name} could not be retrieved right now.`, my: `${name} အတွက် NASA တိုင်းတာချက်များကို ယခု မရယူနိုင်ပါ။` })];
  return [
    L({ en: `${name} — NASA grid point ${g.region.lat.toFixed(2)}°N, ${g.region.lon.toFixed(2)}°E (not a regional average).`, my: `${name} — NASA ဂရစ်အမှတ် ${g.region.lat.toFixed(2)}°N, ${g.region.lon.toFixed(2)}°E (ဒေသ ပျမ်းမျှ မဟုတ်ပါ)။` }),
    tableText(table, lang),
  ];
}

const rankWord = (p: number, lang: Lang): string => {
  const w: [number, T][] = [
    [20, { en: "well below usual", my: "ပုံမှန်ထက် အများကြီး နည်း" }],
    [40, { en: "below usual", my: "ပုံမှန်ထက် နည်း" }],
    [60, { en: "near usual", my: "ပုံမှန်နီးပါး" }],
    [80, { en: "above usual", my: "ပုံမှန်ထက် များ" }],
    [101, { en: "well above usual", my: "ပုံမှန်ထက် အများကြီး များ" }],
  ];
  return w.find(([max]) => p < max)![1][lang];
};

/** One or two sentences: how the latest values rank against past years, plus the EarthLens indicators. */
function history({ lang, a, g }: BuildInput): string[] {
  const L = (t: T) => t[lang];
  const f = (id: string) => a.facts.find((x) => x.id === id) ?? g.facts.find((x) => x.id === id);
  const parts: string[] = [];
  const add = (id: string, name: T) => {
    const x = f(id);
    if (x) parts.push(lang === "my" ? `${name.my} ${rankWord(x.value, lang)} (အဆင့် ${x.value})` : `${name.en} ${rankWord(x.value, lang)} (rank ${x.value} of 100)`);
  };
  add("rain_30d_pct", { en: "30-day rainfall is", my: "ရက် ၃၀ မိုးရေချိန်" });
  add("soil_pct", { en: "soil wetness is", my: "မြေဆီလွှာ စိုစွတ်မှု" });
  add("tmax_7d_pct", { en: "the hottest recent day is", my: "မကြာသေးမီ အပူဆုံးနေ့" });
  const ndvi = a.facts.find((x) => x.id === "ndvi_percentile");
  if (ndvi) parts.push(lang === "my" ? `အပင်စိမ်းလန်းမှု (NDVI) ${rankWord(ndvi.value, lang)} (အဆင့် ${ndvi.value})` : `vegetation greenness (NDVI) is ${rankWord(ndvi.value, lang)} (rank ${ndvi.value} of 100)`);
  const out: string[] = [];
  const span = a.baseline ? `${a.baseline.firstYear}–${a.baseline.lastYear}` : "";
  if (!a.available)
    out.push(L({ en: "The long-term NASA POWER record could not be retrieved, so no rainfall, soil-wetness or heat comparison is shown.", my: "ရေရှည် NASA POWER မှတ်တမ်းကို မရယူနိုင်သဖြင့် မိုးရေချိန်၊ မြေစိုစွတ်မှု သို့မဟုတ် အပူ နှိုင်းယှဉ်ချက် မပြနိုင်ပါ။" }));
  if (parts.length) {
    const joined = parts.join(lang === "my" ? "၊ " : "; ");
    out.push(lang === "my" ? `ယခင်နှစ်များ၏ တူညီသောရက်များ${span ? ` (${span})` : ""}နှင့် နှိုင်းယှဉ်လျှင် - ${joined}။` : `Compared with the same dates in past years${span ? ` (${span})` : ""}: ${joined}.`);
  } else if (a.available) {
    out.push(L({ en: "No historical ranking could be calculated for the latest data.", my: "နောက်ဆုံး အချက်အလက်အတွက် ယခင်နှစ်များနှင့် အဆင့် မတွက်ချက်နိုင်ပါ။" }));
  }
  if (a.drySeasonNow) out.push(L({ en: "It is the usual dry season here, so a rainfall ranking is not meaningful.", my: "ယခုသည် ပုံမှန် ခြောက်သွေ့ရာသီ ဖြစ်သဖြင့် မိုးရေချိန် အဆင့်သည် အဓိပ္ပာယ် မရှိပါ။" }));
  if (a.available) {
    const s = (k: string, v: string) => L(STATUS[`${k}:${v}`]);
    out.push(L({ en: `EarthLens indicators (not official): drought ${s("drought", a.drought)} · wet/flood from rain ${s("wet", a.wet)} · heat ${s("heat", a.heat)}.`, my: `EarthLens ညွှန်ကိန်းများ (တရားဝင် မဟုတ်) - မိုးခေါင်မှု ${s("drought", a.drought)} · မိုးကြောင့် စိုစွတ်မှု/ရေကြီးမှု ${s("wet", a.wet)} · အပူ ${s("heat", a.heat)}။` }));
  }
  return out;
}

const STATUS: Record<string, T> = {
  "drought:none": { en: "none", my: "မရှိ" },
  "drought:watch": { en: "WATCH", my: "စောင့်ကြည့်" },
  "drought:warning": { en: "WARNING", my: "သတိပေး" },
  "drought:unknown": { en: "n/a", my: "မရ" },
  "wet:none": { en: "none", my: "မရှိ" },
  "wet:watch": { en: "WATCH", my: "စောင့်ကြည့်" },
  "wet:unknown": { en: "n/a", my: "မရ" },
  "heat:none": { en: "normal", my: "ပုံမှန်" },
  "heat:unusual": { en: "UNUSUAL", my: "ပုံမှန်မဟုတ်" },
  "heat:unknown": { en: "n/a", my: "မရ" },
};

/** Short outlook: validated forecast if any, otherwise the honest statement plus one historical-pattern sentence. */
function outlookSection({ lang, a, outlook, topics }: BuildInput): string[] {
  const L = (t: T) => t[lang];
  const out: string[] = [];
  const w = a.outlookWindow;
  const range = lang === "my" ? `${w.start} မှ ${w.end}` : `${w.start} to ${w.end}`;
  if (outlook && outlook.probabilities.length) {
    out.push(L({ en: `Forecast for ${range} (validated model):`, my: `${range} အတွက် ခန့်မှန်းချက် (အတည်ပြုထားသော မော်ဒယ်) -` }));
    for (const p of outlook.probabilities)
      out.push(`• ${p.event}: ${p.probability}% — ${p.model.name} ${p.model.version} (${p.validation.skillScoreName} ${p.validation.skillScore}, ${p.validation.hindcastPeriod})`);
  } else {
    out.push(L({ en: `A reliable 30-day forecast cannot be calculated yet: no forecasting model has been validated, so no forecast or probability is shown for ${range}.`, my: `ယုံကြည်စိတ်ချရသော ရက် ၃၀ ခန့်မှန်းချက်ကို ယခု မတွက်ချက်နိုင်သေးပါ - ခန့်မှန်းမော်ဒယ် အတည်မပြုရသေးသဖြင့် ${range} အတွက် ခန့်မှန်းချက် သို့မဟုတ် ဖြစ်နိုင်ခြေ ရာခိုင်နှုန်း မပြပါ။` }));
  }
  const f = (id: string) => a.facts.find((x) => x.id === id);
  const p20 = f("hist_rain_p20"), p50 = f("hist_rain_p50"), p80 = f("hist_rain_p80");
  const span = a.baseline ? `${a.baseline.firstYear}–${a.baseline.lastYear}` : "";
  if (p20 && p50 && p80) {
    const soil = a.soilSeasonalChange
      ? L({ en: `; soil usually ${a.soilSeasonalChange === "wetter" ? "became wetter" : a.soilSeasonalChange === "drier" ? "became drier" : "stayed about the same"}`, my: `၊ မြေဆီလွှာ ${a.soilSeasonalChange === "wetter" ? "ပိုစိုစွတ်လာလေ့ရှိ" : a.soilSeasonalChange === "drier" ? "ပိုခြောက်သွေ့လာလေ့ရှိ" : "သိပ်မပြောင်းလဲလေ့ရှိ"}` })
      : "";
    out.push(L({
      en: `Historical pattern (NOT a forecast): in ${span}, these 30 days brought ${p20.value}–${p80.value} mm of rain (typical ${p50.value} mm)${soil}.`,
      my: `ယခင်နှစ်များ၏ ပုံစံ (ခန့်မှန်းချက် မဟုတ်ပါ) - ${span} တွင် ဤရက် ၃၀ အတွင်း မိုးရေ ${p20.value}–${p80.value} mm (ပုံမှန် ${p50.value} mm) ရွာခဲ့သည်${soil}။`,
    }));
  }
  if (a.drySeasonAhead) out.push(L({ en: "This period is normally dry here, so little rain would be usual.", my: "ဤကာလသည် ပုံမှန်အားဖြင့် ခြောက်သွေ့သဖြင့် မိုးနည်းခြင်းသည် ပုံမှန်ဖြစ်သည်။" }));
  if (topics.includes("flood"))
    out.push(L({ en: "River levels and flood forecasts are not integrated yet.", my: "မြစ်ရေအမြင့်နှင့် ရေကြီးမှု ခန့်မှန်းချက်များ မထည့်သွင်းရသေးပါ။" }));
  return out;
}

function sourcesSection({ lang, fmt, g, a, outlook }: BuildInput): string[] {
  const L = (t: T) => t[lang];
  const out: string[] = [];
  const link = (u: string) => (fmt.showSourceLinks ? ` — ${u}` : "");
  const sources = [...g.sources];
  if (a.available && !sources.some((s) => s.id === POWER_SOURCE.id)) sources.push(POWER_SOURCE);
  for (const s of sources) {
    let detail = "";
    if (s.id === POWER_SOURCE.id) {
      const parts = [g.period ? `${g.period.start} → ${g.period.end}` : "", a.baseline ? L({ en: `history ${a.baseline.firstYear}–${a.baseline.lastYear}`, my: `မှတ်တမ်း ${a.baseline.firstYear}–${a.baseline.lastYear}` }) : ""].filter(Boolean);
      detail = parts.length ? ` (${parts.join("; ")})` : "";
    } else if (s.id === "nasa-modis-ndvi") {
      const n = g.facts.find((x) => x.id === "ndvi_latest");
      detail = `${n?.period ? ` (${n.period.start} → ${n.period.end})` : ""}${fmt.showSourceLinks ? L({ en: " · accessed via https://modis.ornl.gov/data/modis_webservice.html", my: " · ရယူရာ https://modis.ornl.gov/data/modis_webservice.html" }) : ""}`;
    } else if (s.id === "nasa-firms-viirs") {
      const ff = g.facts.find((x) => x.id === "fires_count");
      detail = ff?.period ? ` (${ff.period.start} → ${ff.period.end})` : "";
    }
    out.push(`• ${s.name}${detail}${link(s.url)}`);
  }
  if (outlook?.probabilities.length) {
    for (const p of outlook.probabilities)
      out.push(`• ${p.model.name} ${p.model.version} (${p.model.issued})${link(p.model.url)} — ${p.validation.skillScoreName} ${p.validation.skillScore}, ROC ${p.validation.rocArea}, ${p.validation.hindcastPeriod}`);
  } else {
    out.push(L({ en: "• Forecasting model: none (no model has passed validation yet).", my: "• ခန့်မှန်းမော်ဒယ် - မရှိပါ (အတည်ပြုစစ်ဆေးမှု အောင်မြင်သော မော်ဒယ် မရှိသေးပါ)။" }));
  }
  return out;
}

function disclaimer({ lang, fmt, outlook, limitations, g }: BuildInput): string[] {
  // Notes first, so the required disclaimer is always the last text of every answer.
  const out: string[] = [...limitations, ...g.notes].map((n) => `• ${n}`);
  if (!outlook?.probabilities.length) out.push(fmt.noModelNote[lang]);
  out.push(fmt.disclaimer[lang]);
  return out;
}

const SUMMARY_RANK: [number, T][] = [
  [20, { en: "well below usual", my: "ပုံမှန်ထက် အများကြီး နည်း" }],
  [40, { en: "below usual", my: "ပုံမှန်ထက် နည်း" }],
  [60, { en: "near usual", my: "ပုံမှန်နီးပါး" }],
  [80, { en: "above usual", my: "ပုံမှန်ထက် များ" }],
  [101, { en: "well above usual", my: "ပုံမှန်ထက် အများကြီး များ" }],
];

/**
 * Executive Summary (2–4 sentences): the direct answer, up to 2 key findings from the data table, and the main
 * impact + first option of the most relevant Action Card. No new numbers: every value comes from the table/cards.
 */
export function buildSummaryParts(input: BuildInput): SummaryParts {
  const { lang, table, cards, cardNote, g } = input;
  const L = (t: T) => t[lang];
  const end = lang === "my" ? "။" : ".";

  // (1) Region — exactly the one the answer is about, and where it came from.
  const name = lang === "my" ? g.region.nameMy : `${g.region.name} ${g.region.type}`;
  const source = input.regionSource === "question"
    ? L({ en: "named in your question", my: "သင့်မေးခွန်းတွင် ဖော်ပြထားသည်" })
    : L({ en: "selected on the map", my: "မြေပုံပေါ်တွင် ရွေးချယ်ထားသည်" });
  const other = input.mapRegionName ? L({ en: `; map selection: ${input.mapRegionName}`, my: `၊ မြေပုံတွင် ရွေးထားသည် - ${input.mapRegionName}` }) : "";
  const region = `${name} (${source}${other})`;

  // (2) Key findings — the direct answer plus up to 2 findings from the data table.
  const findings: string[] = [input.aiDirect ?? templateDirect(input)];
  const rows = (table?.rows ?? []).filter((r) => r.reference && r.rank !== null).slice(0, 2);
  if (rows.length) {
    const parts = rows.map((r) => {
      const word = SUMMARY_RANK.find(([max]) => r.rank! < max)![1][lang];
      return lang === "my"
        ? `${r.label} ${r.latest.value} ${r.latest.unit} (${word}၊ ပုံမှန် ${r.reference!.value} ${r.reference!.unit})`
        : `${r.label.charAt(0).toUpperCase()}${r.label.slice(1)}: ${r.latest.value} ${r.latest.unit} (${word}; typical ${r.reference!.value} ${r.reference!.unit})`;
    });
    findings.push(`${parts.join(lang === "my" ? "၊ " : "; ")}${end}`);
  } else if (table?.rows.length) {
    const r = table.rows[0];
    findings.push(lang === "my"
      ? `${r.label} ${r.latest.value} ${r.latest.unit} (ယခင်နှစ်များနှင့် နှိုင်းယှဉ်ချက် မရရှိပါ)${end}`
      : `${r.label}: ${r.latest.value} ${r.latest.unit} (no comparison with past years available)${end}`);
  }

  // (3) Key recommendation — first option of the top card; high-impact cards name the local data to check first.
  let recommendation: string;
  const card = cards[0];
  const opt = card?.suggestedOptions[0]?.replace(/[.။]$/, "");
  if (card && opt) {
    const highImpact = card.decisionType === "water" || card.decisionType === "electricity" || card.decisionType === "disaster";
    const check = highImpact ? card.evidenceNeeded.slice(0, 2).join(lang === "my" ? "၊ " : ", ") : "";
    recommendation = lang === "my"
      ? `${opt}${check ? ` — မလုပ်ဆောင်မီ ${check} ကို စစ်ဆေးပါ` : ""}${end}`
      : `${opt.charAt(0).toUpperCase()}${opt.slice(1)}${check ? ` — check ${check.toLowerCase()} before acting` : ""}${end}`;
  } else {
    recommendation = `${cardNote ?? L({ en: "Insufficient evidence to generate a reliable action recommendation.", my: "ယုံကြည်စိတ်ချရသော လုပ်ဆောင်ချက် အကြံပြုချက် ပေးရန် အထောက်အထား မလုံလောက်ပါ။" })} ${L({ en: "Ask about a specific decision (crops, water, flooding or heat) to get one.", my: "အကြံပြုချက် ရရှိရန် သီးနှံ၊ ရေ၊ ရေကြီးမှု သို့မဟုတ် အပူ စသည့် ဆုံးဖြတ်ချက်တစ်ခုကို တိကျစွာ မေးပါ။" })}`;
  }
  return { region, keyFindings: findings.join(" "), recommendation, regionSelected: true };
}

/** Plain-text summary: three labelled paragraphs. */
export function summaryText(p: SummaryParts, lang: Lang): string {
  const lab = lang === "my"
    ? ["တိုင်းဒေသကြီး / ပြည်နယ်", "အဓိကတွေ့ရှိချက်", "အဓိကအကြံပြုချက်"]
    : ["Region", "Key findings", "Key recommendation"];
  return `${lab[0]}: ${p.region}\n\n${lab[1]}: ${p.keyFindings}\n\n${lab[2]}: ${p.recommendation}`;
}

export function buildAnswer(input: BuildInput): { text: string; sections: Record<SectionId, string>; summaryParts: SummaryParts } {
  const { lang, fmt } = input;
  const summaryParts = buildSummaryParts(input);
  const bodies: Record<SectionId, string[]> = {
    summary: [summaryText(summaryParts, lang)],
    current: current(input),
    history: history(input),
    outlook: outlookSection(input),
    actions: [cardsText(input.cards, input.cardNote, lang)],
    sources: sourcesSection(input),
    disclaimer: disclaimer(input),
  };
  const sections = {} as Record<SectionId, string>;
  const parts: string[] = [];
  for (const s of fmt.sections) {
    const body = bodies[s.id].join("\n");
    sections[s.id] = body;
    parts.push(`${heading(fmt, s.id, lang)}\n${body}`);
    if (s.id === "summary") parts.push(`— ${fmt.detailedHeading[lang]} —`);
  }
  return { text: parts.join("\n\n"), sections, summaryParts };
}
